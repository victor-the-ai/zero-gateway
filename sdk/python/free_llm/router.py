import os
import time
import logging
from typing import Optional, Dict, List, Any, Tuple, Generator, AsyncGenerator
import httpx
from dotenv import load_dotenv
from .models import ProviderSpec, ChatCompletionRequest
from .registry import RegistryManager

# Load any .env in cwd or parents
load_dotenv()

logger = logging.getLogger("free_llm.router")

class FreeLLMRouter:
    """
    Intelligent router and cascading failover engine for free LLM providers.
    """

    def __init__(self, registry: Optional[RegistryManager] = None):
        self.registry = registry or RegistryManager()
        self.throttled_until: Dict[str, float] = {}  # provider_id -> timestamp
        self.stats: Dict[str, Dict[str, int]] = {}   # provider_id -> {success: 0, throttled: 0, failed: 0}

    def is_provider_configured(self, provider: ProviderSpec) -> bool:
        """Checks if required API key or auth is present in environment."""
        if provider.tier.auth_type == "none" or provider.api.env_var is None:
            return True
        val = os.getenv(provider.api.env_var)
        return bool(val and val.strip())

    def get_provider_key(self, provider: ProviderSpec) -> Optional[str]:
        if provider.api.env_var:
            return os.getenv(provider.api.env_var)
        return None

    def get_configured_providers(self) -> List[ProviderSpec]:
        """Returns list of providers that are active and currently configured."""
        return [
            p for p in self.registry.data.providers
            if p.status == "active" and self.is_provider_configured(p)
        ]

    def _is_throttled(self, provider_id: str) -> bool:
        cooldown_until = self.throttled_until.get(provider_id, 0.0)
        return time.time() < cooldown_until

    def mark_throttled(self, provider_id: str, cooldown_seconds: float = 60.0):
        self.throttled_until[provider_id] = time.time() + cooldown_seconds
        self._record_stat(provider_id, "throttled")
        logger.warning(f"Provider '{provider_id}' throttled for {cooldown_seconds}s (HTTP 429).")

    def _record_stat(self, provider_id: str, event_type: str):
        if provider_id not in self.stats:
            self.stats[provider_id] = {"success": 0, "throttled": 0, "failed": 0}
        self.stats[provider_id][event_type] += 1

    def resolve_candidates(self, requested_model: str) -> List[Tuple[ProviderSpec, str]]:
        """
        Resolves model alias or ID to ordered list of (ProviderSpec, target_model_id).
        Excludes unconfigured providers and deprioritizes currently throttled ones.
        """
        candidates: List[Tuple[ProviderSpec, str]] = []
        model_req = requested_model.strip()

        # Handle 'auto' alias: pick best available configured provider
        if model_req in ["auto", "default"]:
            for p in self.get_configured_providers():
                if p.models:
                    candidates.append((p, p.models[0].id))
            return self._sort_candidates(candidates)

        # 1. Check alias routing table
        matches = self.registry.get_providers_for_alias(model_req)
        for m in matches:
            provider = self.registry.get_provider(m["provider_id"])
            if provider and self.is_provider_configured(provider):
                candidates.append((provider, m["model_id"]))

        # 2. Check direct model match across providers if no alias matched
        if not candidates:
            for p in self.get_configured_providers():
                for m in p.models:
                    if m.id.lower() == model_req.lower():
                        candidates.append((p, m.id))

        # 3. Fallback: if user specified a common family (e.g. 'llama-3.3' or 'deepseek')
        if not candidates:
            for p in self.get_configured_providers():
                for m in p.models:
                    if model_req.lower() in m.id.lower():
                        candidates.append((p, m.id))

        return self._sort_candidates(candidates)

    def _sort_candidates(self, candidates: List[Tuple[ProviderSpec, str]]) -> List[Tuple[ProviderSpec, str]]:
        # Sort so non-throttled candidates come first, and permanent_free come before zero-auth
        def sort_key(item: Tuple[ProviderSpec, str]):
            provider, _ = item
            throttled = 1 if self._is_throttled(provider.id) else 0
            # Priority: permanent_free with key (tier 0) -> zero_auth (tier 1)
            tier_order = 1 if provider.tier.auth_type == "none" else 0
            return (throttled, tier_order)

        return sorted(candidates, key=sort_key)

    def execute_chat_completion(
        self,
        request: ChatCompletionRequest,
        client: Optional[httpx.Client] = None
    ) -> Dict[str, Any]:
        """
        Executes non-streaming chat completion with automatic failover.
        """
        candidates = self.resolve_candidates(request.model)
        if not candidates:
            configured = [p.name for p in self.get_configured_providers()]
            raise RuntimeError(
                f"No configured free provider found for model '{request.model}'. "
                f"Configured providers in environment: {configured or 'None'}. "
                "Check your .env keys or use model='auto'."
            )

        owns_client = False
        if client is None:
            client = httpx.Client(timeout=45.0)
            owns_client = True

        last_error = None
        try:
            for provider, model_id in candidates:
                if self._is_throttled(provider.id):
                    continue

                url = f"{provider.api.base_url.rstrip('/')}/chat/completions"
                headers = {"Content-Type": "application/json"}
                headers.update(provider.api.default_headers)

                key = self.get_provider_key(provider)
                if key:
                    headers["Authorization"] = f"Bearer {key}"

                payload = request.model_dump(exclude_none=True)
                payload["model"] = model_id
                payload["stream"] = False

                logger.info(f"Attempting model '{model_id}' on provider '{provider.id}'...")
                try:
                    resp = client.post(url, headers=headers, json=payload)
                    
                    if resp.status_code == 429:
                        self.mark_throttled(provider.id, cooldown_seconds=60.0)
                        logger.warning(f"Rate limited (429) on {provider.id}. Cascading to next free provider...")
                        continue

                    if resp.status_code in [500, 502, 503, 504]:
                        self.mark_throttled(provider.id, cooldown_seconds=30.0)
                        logger.warning(f"Server error ({resp.status_code}) on {provider.id}. Cascading...")
                        continue

                    resp.raise_for_status()
                    data = resp.json()
                    data["_free_llm_meta"] = {
                        "provider_id": provider.id,
                        "provider_name": provider.name,
                        "model_served": model_id,
                        "base_url": provider.api.base_url
                    }
                    self._record_stat(provider.id, "success")
                    return data

                except httpx.HTTPStatusError as e:
                    last_error = e
                    if e.response.status_code == 429:
                        self.mark_throttled(provider.id, cooldown_seconds=60.0)
                    else:
                        self._record_stat(provider.id, "failed")
                        logger.error(f"Error from {provider.id}: {e.response.text[:200]}")
                except Exception as e:
                    last_error = e
                    self._record_stat(provider.id, "failed")
                    logger.error(f"Network error with {provider.id}: {e}")

            raise RuntimeError(f"All candidate free providers failed for '{request.model}'. Last error: {last_error}")
        finally:
            if owns_client:
                client.close()

    def stream_chat_completion(
        self,
        request: ChatCompletionRequest
    ) -> Generator[bytes, None, None]:
        """
        Streams SSE chunks from the selected provider with failover on initial connection.
        """
        candidates = self.resolve_candidates(request.model)
        if not candidates:
            raise RuntimeError(f"No free provider available for model '{request.model}'.")

        last_error = None
        for provider, model_id in candidates:
            if self._is_throttled(provider.id):
                continue

            url = f"{provider.api.base_url.rstrip('/')}/chat/completions"
            headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}
            headers.update(provider.api.default_headers)

            key = self.get_provider_key(provider)
            if key:
                headers["Authorization"] = f"Bearer {key}"

            payload = request.model_dump(exclude_none=True)
            payload["model"] = model_id
            payload["stream"] = True

            try:
                with httpx.Client(timeout=60.0) as client:
                    with client.stream("POST", url, headers=headers, json=payload) as response:
                        if response.status_code == 429:
                            self.mark_throttled(provider.id, cooldown_seconds=60.0)
                            continue
                        if response.status_code >= 400:
                            self.mark_throttled(provider.id, cooldown_seconds=30.0)
                            continue

                        self._record_stat(provider.id, "success")
                        for line in response.iter_lines():
                            if line:
                                yield f"{line}\n\n".encode("utf-8")
                        return
            except Exception as e:
                last_error = e
                self._record_stat(provider.id, "failed")
                continue

        raise RuntimeError(f"All free providers failed for stream: {last_error}")
