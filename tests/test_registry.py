import pytest
from pathlib import Path
from free_llm.registry import RegistryManager

def test_registry_loads_successfully():
    reg = RegistryManager(auto_sync=False)
    data = reg.data
    assert data is not None
    assert len(data.providers) >= 8
    assert "groq" in [p.id for p in data.providers]
    assert "cerebras" in [p.id for p in data.providers]
    assert "google_ai_studio" in [p.id for p in data.providers]

def test_alias_lookup():
    reg = RegistryManager(auto_sync=False)
    llama_providers = reg.get_providers_for_alias("llama-3.3-70b")
    assert len(llama_providers) >= 2
    provider_ids = [p["provider_id"] for p in llama_providers]
    assert "groq" in provider_ids or "cerebras" in provider_ids

def test_get_all_models():
    reg = RegistryManager(auto_sync=False)
    models = reg.get_all_models()
    assert len(models) >= 15
    model_ids = [m["id"] for m in models]
    assert "gemini-2.5-flash" in model_ids or "gemini-1.5-flash" in model_ids
