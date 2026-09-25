import os
import re
import time
import logging
from typing import Optional, Dict, List, Any, Tuple, Generator, AsyncGenerator
import httpx
from dotenv import load_dotenv
from .models import ProviderSpec, ChatCompletionRequest
from .registry import RegistryManager

# Load any .env in cwd or parents
load_dotenv()

logger = logging.getLogger("zerogateway.router")

def extract_reset_window(
    response: Optional[httpx.Response] = None,
    default_cooldown: float = 60.0
) -> float:
    """
    Extracts rate limit reset window or retry cooldown (in seconds) from response headers or error body.
    Supports standard Retry-After, X-RateLimit-Reset, and provider-specific bodies (like Google Gemini).
    """
    if response is None:
        return default_cooldown

    # 1. Retry-After header (seconds)
    retry_after = response.headers.get("retry-after")
    if retry_after:
        try:
            val = float(retry_after)
            if val > 0:
                return val
        except ValueError:
            pass

    # 2. X-RateLimit-Reset headers
    for h in ["x-ratelimit-reset", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens"]:
        reset_val = response.headers.get(h)
        if reset_val:
            try:
                val = float(reset_val)
                if val > 1_000_000_000:  # Epoch timestamp
                    remaining = max(1.0, val - time.time())
                    return remaining
                elif val > 0:
                    return val
            except ValueError:
                pass

    # 3. Provider-specific JSON error body (e.g. Google AI Studio / Gemini)
    try:
        data = response.json()
        if isinstance(data, dict):
            error = data.get("error")
            if isinstance(error, dict):
                # Google Gemini format: error.details -> retryDelay
                details = error.get("details", [])
                if isinstance(details, list):
                    for d in details:
                        if isinstance(d, dict) and "retryDelay" in d:
                            delay_str = str(d["retryDelay"]).rstrip("s")
                            return float(delay_str)
                # Direct retry_after field
                if "retry_after" in error:
                    return float(error["retry_after"])
                # Error message regex
                msg = str(error.get("message", ""))
                match = re.search(r"retry after\s+([0-9.]+)\s*s?", msg, re.IGNORECASE)
                if match:
                    return float(match.group(1))
    except Exception:
        pass

    return default_cooldown

class ZeroGatewayRouter:
    """
    Intelligent router and cascading failover engine for free LLM providers.
    Supports provider-level cascading and intra-provider multi-key swapping with reset window tracking.
    """

    def __init__(
        self,
        registry: Optional[RegistryManager] = None,
        enable_key_rotation: Optional[bool] = None,
        enable_provider_rotation: Optional[bool] = None,
        api_keys: Optional[Dict[str, List[str]]] = None,
        default_cooldown: float = 60.0
    ):
        self.registry = registry or RegistryManager()
        self.throttled_until: Dict[str, float] = {}  # provider_id -> timestamp
        self.key_throttled_until: Dict[Tuple[str, str], float] = {}  # (provider_id, key) -> timestamp
        self.stats: Dict[str, Dict[str, int]] = {}   # provider_id -> {success: 0, throttled: 0, failed: 0}
        self.key_stats: Dict[str, Dict[str, Dict[str, int]]] = {}  # provider_id -> key_preview -> stats
        self.custom_api_keys: Dict[str, List[str]] = api_keys or {}
        self.default_cooldown = default_cooldown

        # Key swapping: configurable option, NOT enabled by default
        if enable_key_rotation is not None:
            self.enable_key_rotation = enable_key_rotation
        else:
            self.enable_key_rotation = os.getenv("ENABLE_KEY_ROTATION", "false").lower() in ("true", "1", "yes")

        # Provider swapping: configurable option (defaults to True for cascading failover)
        if enable_provider_rotation is not None:
            self.enable_provider_rotation = enable_provider_rotation
        else:
            self.enable_provider_rotation = os.getenv("ENABLE_PROVIDER_ROTATION", "true").lower() in ("true", "1", "yes")

    def get_provider_keys(self, provider: ProviderSpec) -> List[str]:
        """
        Retrieves all configured API keys for a provider.
        Supports comma-separated values, plural env vars (e.g. GEMINI_API_KEYS),
        indexed env vars (GEMINI_API_KEY_1, _2), and programmatic keys.
        """
        if self.custom_api_keys:
            if provider.id in self.custom_api_keys:
                return list(self.custom_api_keys[provider.id])
            if provider.api.env_var and provider.api.env_var in self.custom_api_keys:
                return list(self.custom_api_keys[provider.api.env_var])

        keys: List[str] = []
        if provider.api.env_var:
            env_var = provider.api.env_var

            # 1. Main env_var (supports comma-separated string)
            raw = os.getenv(env_var, "")
            if raw and raw.strip():
                for k in raw.replace("\n", ",").split(","):
                    k_clean = k.strip()
                    if k_clean and k_clean not in keys:
                        keys.append(k_clean)

            # 2. Plural form (e.g. GEMINI_API_KEYS)
            plural_var = f"{env_var}S" if not env_var.endswith("S") else env_var
            raw_plural = os.getenv(plural_var, "")
            if raw_plural and raw_plural.strip():
                for k in raw_plural.replace("\n", ",").split(","):
                    k_clean = k.strip()
                    if k_clean and k_clean not in keys:
                        keys.append(k_clean)

            # 3. Indexed form (e.g. GEMINI_API_KEY_1, GEMINI_API_KEY_2)
            idx = 1
            while True:
                k_val = os.getenv(f"{env_var}_{idx}")
                if not k_val:
                    break
                k_clean = k_val.strip()
                if k_clean and k_clean not in keys:
                    keys.append(k_clean)
                idx += 1

        # Fallback to get_provider_key if overridden or patched
        single_key = self.get_provider_key(provider)
        if single_key and single_key not in keys:
            keys.append(single_key)

        return keys

    def is_provider_configured(self, provider: ProviderSpec) -> bool:
        """Checks if required API key or auth is present in environment."""
        if provider.tier.auth_type == "none" or provider.api.env_var is None:
            return True
        keys = self.get_provider_keys(provider)
        return len(keys) > 0

    def get_provider_key(self, provider: ProviderSpec) -> Optional[str]:
        """Returns the primary or current active unthrottled key for the provider."""
        if not provider.api.env_var:
            return None
        # Direct env check for compatibility
        return os.getenv(provider.api.env_var)

    def get_configured_providers(self) -> List[ProviderSpec]:
        """Returns list of providers that are active and currently configured."""
        return [
            p for p in self.registry.data.providers
            if p.status == "active" and self.is_provider_configured(p)
        ]

    def _is_throttled(self, provider_id: str) -> bool:
        cooldown_until = self.throttled_until.get(provider_id, 0.0)
        return time.time() < cooldown_until

    def _is_key_throttled(self, provider_id: str, key: str) -> bool:
        cooldown_until = self.key_throttled_until.get((provider_id, key), 0.0)
        return time.time() < cooldown_until

    def get_key_reset_window(self, provider_id: str, key: str) -> float:
        """Returns remaining seconds until key cooldown expires."""
        cooldown_until = self.key_throttled_until.get((provider_id, key), 0.0)
        return max(0.0, cooldown_until - time.time())

    def mark_throttled(self, provider_id: str, cooldown_seconds: float = 60.0):
        self.throttled_until[provider_id] = time.time() + cooldown_seconds
        self._record_stat(provider_id, "throttled")
        logger.warning(f"Provider '{provider_id}' throttled for {cooldown_seconds:.1f}s (HTTP 429).")

    def mark_key_throttled(self, provider_id: str, key: str, cooldown_seconds: float = 60.0):
        """Marks a specific key throttled/expired after noting its reset window."""
        reset_time = time.time() + cooldown_seconds
        self.key_throttled_until[(provider_id, key)] = reset_time
        self._record_key_stat(provider_id, key, "throttled")
        key_preview = f"...{key[-4:]}" if len(key) > 4 else key
        logger.warning(
            f"Key '{key_preview}' for provider '{provider_id}' throttled/expired. "
            f"Reset window: {cooldown_seconds:.1f}s (available again in {cooldown_seconds:.1f}s)."
        )

    def _record_stat(self, provider_id: str, event_type: str):
        if provider_id not in self.stats:
            self.stats[provider_id] = {"success": 0, "throttled": 0, "failed": 0}
        self.stats[provider_id][event_type] += 1

    def _record_key_stat(self, provider_id: str, key: str, event_type: str):
        key_preview = f"...{key[-4:]}" if len(key) > 4 else key
        if provider_id not in self.key_stats:
            self.key_stats[provider_id] = {}
        if key_preview not in self.key_stats[provider_id]:
            self.key_stats[provider_id][key_preview] = {"success": 0, "throttled": 0, "failed": 0}
        self.key_stats[provider_id][key_preview][event_type] += 1

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
            tier_order = 1 if provider.tier.auth_type == "none" else 0
            return (throttled, tier_order)

        return sorted(candidates, key=sort_key)

    def execute_chat_completion(
        self,
        request: ChatCompletionRequest,
        client: Optional[httpx.Client] = None
    ) -> Dict[str, Any]:
        """
        Executes non-streaming chat completion with configurable key swapping and provider cascading.
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

                all_keys = self.get_provider_keys(provider)
                if not all_keys:
                    keys_to_attempt = [None]
                elif not self.enable_key_rotation:
                    # Key swapping disabled (default): only use primary key
                    keys_to_attempt = [all_keys[0]]
                else:
                    # Key swapping enabled: pick available unthrottled keys
                    keys_to_attempt = [k for k in all_keys if not self._is_key_throttled(provider.id, k)]
                    if not keys_to_attempt:
                        # All keys for this provider are throttled; note shortest reset window
                        min_reset = min(self.key_throttled_until.get((provider.id, k), 0.0) for k in all_keys)
                        remaining = max(1.0, min_reset - time.time())
                        self.throttled_until[provider.id] = time.time() + remaining
                        logger.warning(
                            f"All keys for provider '{provider.id}' are throttled. "
                            f"Shortest key reset window is {remaining:.1f}s."
                        )
                        if not self.enable_provider_rotation:
                            break
                        continue

                provider_succeeded = False
                for key in keys_to_attempt:
                    url = f"{provider.api.base_url.rstrip('/')}/chat/completions"
                    headers = {"Content-Type": "application/json"}
                    headers.update(provider.api.default_headers)

                    if key:
                        headers["Authorization"] = f"Bearer {key}"

                    payload = request.model_dump(exclude_none=True)
                    payload["model"] = model_id
                    payload["stream"] = False

                    key_preview = f"...{key[-4:]}" if key and len(key) > 4 else (key or "none")
                    logger.info(f"Attempting model '{model_id}' on provider '{provider.id}' with key '{key_preview}'...")

                    try:
                        resp = client.post(url, headers=headers, json=payload)

                        if resp.status_code == 429:
                            reset_window = extract_reset_window(resp, default_cooldown=self.default_cooldown)
                            if self.enable_key_rotation and key:
                                self.mark_key_throttled(provider.id, key, cooldown_seconds=reset_window)
                                logger.warning(
                                    f"Rate limited (429) on key '{key_preview}' for {provider.id}. "
                                    f"Reset window: {reset_window:.1f}s. Swapping to next key..."
                                )
                                continue
                            else:
                                self.mark_throttled(provider.id, cooldown_seconds=reset_window)
                                logger.warning(f"Rate limited (429) on {provider.id}. Cascading...")
                                break

                        if resp.status_code in [401, 403]:
                            # Expired or invalid key
                            reset_window = extract_reset_window(resp, default_cooldown=86400.0)
                            if self.enable_key_rotation and key:
                                self.mark_key_throttled(provider.id, key, cooldown_seconds=reset_window)
                                logger.warning(
                                    f"Key '{key_preview}' for {provider.id} expired/unauthorized ({resp.status_code}). "
                                    f"Noted reset window: {reset_window:.1f}s. Swapping to next key..."
                                )
                                continue
                            else:
                                self._record_stat(provider.id, "failed")
                                logger.warning(f"Auth error ({resp.status_code}) on {provider.id}.")
                                break

                        if resp.status_code in [500, 502, 503, 504]:
                            self.mark_throttled(provider.id, cooldown_seconds=30.0)
                            logger.warning(f"Server error ({resp.status_code}) on {provider.id}. Cascading...")
                            break

                        resp.raise_for_status()
                        data = resp.json()
                        data["_zerogateway_meta"] = {
                            "provider_id": provider.id,
                            "provider_name": provider.name,
                            "model_served": model_id,
                            "base_url": provider.api.base_url,
                            "key_used": key_preview if key else None
                        }
                        data["_free_llm_meta"] = data["_zerogateway_meta"]
                        self._record_stat(provider.id, "success")
                        if key:
                            self._record_key_stat(provider.id, key, "success")
                        provider_succeeded = True
                        return data

                    except httpx.HTTPStatusError as e:
                        last_error = e
                        if e.response.status_code == 429:
                            reset_window = extract_reset_window(e.response, default_cooldown=self.default_cooldown)
                            if self.enable_key_rotation and key:
                                self.mark_key_throttled(provider.id, key, cooldown_seconds=reset_window)
                                continue
                            else:
                                self.mark_throttled(provider.id, cooldown_seconds=reset_window)
                                break
                        elif e.response.status_code in [401, 403] and self.enable_key_rotation and key:
                            self.mark_key_throttled(provider.id, key, cooldown_seconds=86400.0)
                            continue
                        else:
                            self._record_stat(provider.id, "failed")
                            if key:
                                self._record_key_stat(provider.id, key, "failed")
                            logger.error(f"Error from {provider.id}: {e.response.text[:200]}")
                            break
                    except Exception as e:
                        last_error = e
                        self._record_stat(provider.id, "failed")
                        if key:
                            self._record_key_stat(provider.id, key, "failed")
                        logger.error(f"Network error with {provider.id}: {e}")
                        break

                if provider_succeeded:
                    break

                if not self.enable_provider_rotation:
                    logger.info(f"Provider rotation disabled. Halting after candidate '{provider.id}'.")
                    break

            raise RuntimeError(f"All candidate free providers/keys failed for '{request.model}'. Last error: {last_error}")
        finally:
            if owns_client:
                client.close()

    def stream_chat_completion(
        self,
        request: ChatCompletionRequest
    ) -> Generator[bytes, None, None]:
        """
        Streams SSE chunks from the selected provider with key and provider failover on initial connection.
        """
        candidates = self.resolve_candidates(request.model)
        if not candidates:
            raise RuntimeError(f"No free provider available for model '{request.model}'.")

        last_error = None
        for provider, model_id in candidates:
            if self._is_throttled(provider.id):
                continue

            all_keys = self.get_provider_keys(provider)
            if not all_keys:
                keys_to_attempt = [None]
            elif not self.enable_key_rotation:
                keys_to_attempt = [all_keys[0]]
            else:
                keys_to_attempt = [k for k in all_keys if not self._is_key_throttled(provider.id, k)]
                if not keys_to_attempt:
                    min_reset = min(self.key_throttled_until.get((provider.id, k), 0.0) for k in all_keys)
                    remaining = max(1.0, min_reset - time.time())
                    self.throttled_until[provider.id] = time.time() + remaining
                    if not self.enable_provider_rotation:
                        break
                    continue

            for key in keys_to_attempt:
                url = f"{provider.api.base_url.rstrip('/')}/chat/completions"
                headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}
                headers.update(provider.api.default_headers)

                if key:
                    headers["Authorization"] = f"Bearer {key}"

                payload = request.model_dump(exclude_none=True)
                payload["model"] = model_id
                payload["stream"] = True

                try:
                    with httpx.Client(timeout=60.0) as client:
                        with client.stream("POST", url, headers=headers, json=payload) as response:
                            if response.status_code == 429:
                                reset_window = extract_reset_window(response, default_cooldown=self.default_cooldown)
                                if self.enable_key_rotation and key:
                                    self.mark_key_throttled(provider.id, key, cooldown_seconds=reset_window)
                                    continue
                                else:
                                    self.mark_throttled(provider.id, cooldown_seconds=reset_window)
                                    break
                            if response.status_code in [401, 403]:
                                reset_window = extract_reset_window(response, default_cooldown=86400.0)
                                if self.enable_key_rotation and key:
                                    self.mark_key_throttled(provider.id, key, cooldown_seconds=reset_window)
                                    continue
                                else:
                                    self._record_stat(provider.id, "failed")
                                    break
                            if response.status_code >= 400:
                                self.mark_throttled(provider.id, cooldown_seconds=30.0)
                                break

                            self._record_stat(provider.id, "success")
                            if key:
                                self._record_key_stat(provider.id, key, "success")
                            for line in response.iter_lines():
                                if line:
                                    yield f"{line}\n\n".encode("utf-8")
                            return
                except Exception as e:
                    last_error = e
                    self._record_stat(provider.id, "failed")
                    if key:
                        self._record_key_stat(provider.id, key, "failed")
                    continue

            if not self.enable_provider_rotation:
                break

        raise RuntimeError(f"All free providers failed for stream: {last_error}")

FreeLLMRouter = ZeroGatewayRouter

