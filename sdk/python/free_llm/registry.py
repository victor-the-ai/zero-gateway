import os
import json
import time
import httpx
from pathlib import Path
from typing import Optional, Dict, List, Any
from .models import RegistryData, ProviderSpec

DEFAULT_REGISTRY_URL = "https://raw.githubusercontent.com/free-llm-hub/free-llm-hub/main/registry/index.json"
CACHE_DIR = Path(os.path.expanduser(os.getenv("FREE_LLM_CACHE_DIR", "~/.cache/free_llm")))
CACHE_FILE = CACHE_DIR / "registry_index.json"
CACHE_TTL_SECONDS = 86400  # 24 hours

class RegistryManager:
    """
    Manages fetching, caching, and loading of the Free LLM Registry.
    """

    def __init__(self, registry_url: Optional[str] = None, auto_sync: bool = True):
        self.registry_url = registry_url or os.getenv("FREE_LLM_REGISTRY_URL", DEFAULT_REGISTRY_URL)
        self.auto_sync = auto_sync
        self._data: Optional[RegistryData] = None
        self.load()

    def load(self, force_remote: bool = False) -> RegistryData:
        """
        Loads the registry data following this priority:
        1. Remote sync if force_remote or cache expired
        2. Local cache file (~/.cache/free_llm/registry_index.json)
        3. Bundled registry file in the repository (fallback)
        """
        if force_remote or (self.auto_sync and self._is_cache_stale()):
            try:
                self.sync()
            except Exception as e:
                # Silently fall back to cached or bundled version
                pass

        # Try cache file
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    content = json.load(f)
                self._data = RegistryData(**content)
                return self._data
            except Exception:
                pass

        # Fallback to local repo file if running inside clone
        repo_index = Path(__file__).resolve().parent.parent.parent.parent / "registry" / "index.json"
        if repo_index.exists():
            with open(repo_index, "r", encoding="utf-8") as f:
                content = json.load(f)
            self._data = RegistryData(**content)
            return self._data

        raise RuntimeError("Failed to load Free LLM Registry: No cache or bundled registry found.")

    def sync(self) -> None:
        """
        Fetches the latest index from remote Git/CDN and saves to local cache.
        """
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(self.registry_url)
                resp.raise_for_status()
                data = resp.json()

            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            self._data = RegistryData(**data)
        except Exception as e:
            raise RuntimeError(f"Failed to sync registry from {self.registry_url}: {e}")

    def _is_cache_stale(self) -> bool:
        if not CACHE_FILE.exists():
            return True
        mtime = CACHE_FILE.stat().st_mtime
        return (time.time() - mtime) > CACHE_TTL_SECONDS

    @property
    def data(self) -> RegistryData:
        if self._data is None:
            self.load()
        return self._data

    def get_provider(self, provider_id: str) -> Optional[ProviderSpec]:
        for p in self.data.providers:
            if p.id == provider_id:
                return p
        return None

    def get_providers_for_alias(self, alias: str) -> List[Dict[str, Any]]:
        alias_lower = alias.lower()
        if alias_lower in self.data.alias_routing_table:
            return self.data.alias_routing_table[alias_lower]
        
        # Check if direct model ID match
        matches = []
        for p in self.data.providers:
            for m in p.models:
                if m.id.lower() == alias_lower:
                    matches.append({
                        "provider_id": p.id,
                        "model_id": m.id,
                        "limits": p.limits.model_dump() if p.limits else {}
                    })
        return matches

    def get_all_models(self) -> List[Dict[str, Any]]:
        models = []
        for p in self.data.providers:
            for m in p.models:
                models.append({
                    "id": m.id,
                    "provider": p.name,
                    "provider_id": p.id,
                    "aliases": m.aliases,
                    "context_window": m.context_window,
                    "supports_tools": m.supports_tools,
                    "supports_vision": m.supports_vision
                })
        return models
