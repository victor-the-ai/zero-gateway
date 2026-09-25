#!/usr/bin/env python3
"""
Compiles individual provider YAML definitions in registry/providers/
into a validated single JSON bundle: registry/index.json
"""

import os
import sys
import json
import glob
from pathlib import Path
from datetime import datetime, timezone
import yaml
from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Dict, Any

REPO_ROOT = Path(__file__).resolve().parent.parent
PROVIDERS_DIR = REPO_ROOT / "registry" / "providers"
OUTPUT_INDEX = REPO_ROOT / "registry" / "index.json"

class PromoDetails(BaseModel):
    expires_at: Optional[str] = None
    initial_credits_usd: float = 0.0
    promo_code: Optional[str] = None
    notes: Optional[str] = ""

class TierConfig(BaseModel):
    type: str
    requires_credit_card: bool
    auth_type: str
    signup_methods: List[str] = []
    promo_details: Optional[PromoDetails] = None

class ApiConfig(BaseModel):
    format: str
    base_url: str
    env_var: Optional[str] = None
    default_headers: Dict[str, str] = {}

class LimitsConfig(BaseModel):
    requests_per_minute: Optional[int] = None
    requests_per_day: Optional[int] = None
    tokens_per_minute: Optional[int] = None
    tokens_per_day: Optional[int] = None
    concurrency: Optional[int] = None

class ModelSpec(BaseModel):
    id: str
    display_name: Optional[str] = None
    aliases: List[str] = []
    context_window: Optional[int] = None
    supports_tools: bool = False
    supports_vision: bool = False
    supports_streaming: bool = True

class ProviderDefinition(BaseModel):
    id: str
    name: str
    website: str
    console_url: Optional[str] = None
    status: str
    tier: TierConfig
    api: ApiConfig
    limits: Optional[LimitsConfig] = None
    models: List[ModelSpec]

def compile_registry():
    print(f"[*] Scanning provider YAML files in {PROVIDERS_DIR}...")
    yaml_files = sorted(glob.glob(str(PROVIDERS_DIR / "*.yaml")))
    if not yaml_files:
        print("[!] No YAML files found in registry/providers/")
        sys.exit(1)

    providers = []
    alias_to_providers = {}
    model_count = 0

    for y_file in yaml_files:
        try:
            with open(y_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            provider = ProviderDefinition(**data)
            providers.append(provider.model_dump())
            
            # Index aliases
            for m in provider.models:
                model_count += 1
                for alias in m.aliases:
                    if alias not in alias_to_providers:
                        alias_to_providers[alias] = []
                    alias_to_providers[alias].append({
                        "provider_id": provider.id,
                        "model_id": m.id,
                        "limits": provider.limits.model_dump() if provider.limits else {}
                    })

            print(f"  [✓] Loaded & validated: {provider.name} ({provider.id}) - {len(provider.models)} models")
        except Exception as e:
            print(f"  [✗] Error validating {y_file}: {e}")
            sys.exit(1)

    index_payload = {
        "version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "total_providers": len(providers),
            "total_models": model_count,
            "unique_aliases": len(alias_to_providers)
        },
        "alias_routing_table": alias_to_providers,
        "providers": providers
    }

    OUTPUT_INDEX.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_INDEX, "w", encoding="utf-8") as f:
        json.dump(index_payload, f, indent=2)

    print(f"\n[+] Successfully compiled {len(providers)} providers ({model_count} models) into {OUTPUT_INDEX}")

if __name__ == "__main__":
    compile_registry()
