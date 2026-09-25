#!/usr/bin/env python3
"""
Automated Canary Health Probe for Free LLM Providers.
Runs in GitHub Actions or locally to verify which providers are currently operational.
"""

import os
import sys
import time
import json
from pathlib import Path
from datetime import datetime, timezone
import httpx
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "sdk" / "python"))

from free_llm.registry import RegistryManager

load_dotenv()

OUTPUT_HEALTH = REPO_ROOT / "registry" / "health_status.json"

def run_health_checks():
    reg = RegistryManager(auto_sync=False)
    results = {}
    total = len(reg.data.providers)
    passed = 0

    print(f"[*] Starting health check on {total} providers at {datetime.now(timezone.utc).isoformat()}...\n")

    for p in reg.data.providers:
        provider_id = p.id
        env_var = p.api.env_var
        auth_type = p.tier.auth_type
        base_url = p.api.base_url

        key = os.getenv(env_var) if env_var else None

        if auth_type != "none" and not key:
            print(f"  [-] {p.name}: Skipped (no {env_var} provided for canary test)")
            results[provider_id] = {
                "status": "skipped",
                "reason": f"Missing {env_var}",
                "last_checked": datetime.now(timezone.utc).isoformat()
            }
            continue

        # Choose the first model to probe
        test_model = p.models[0].id if p.models else "default"
        headers = {"Content-Type": "application/json"}
        headers.update(p.api.default_headers)
        if key:
            headers["Authorization"] = f"Bearer {key}"

        payload = {
            "model": test_model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 5
        }

        url = f"{base_url.rstrip('/')}/chat/completions"
        start = time.time()
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                latency = time.time() - start

                if resp.status_code == 200:
                    passed += 1
                    print(f"  [✓] {p.name}: Operational ({latency:.2f}s)")
                    results[provider_id] = {
                        "status": "operational",
                        "http_code": 200,
                        "latency_seconds": round(latency, 2),
                        "model_tested": test_model,
                        "last_checked": datetime.now(timezone.utc).isoformat()
                    }
                elif resp.status_code == 429:
                    print(f"  [!] {p.name}: Rate Limited (429)")
                    results[provider_id] = {
                        "status": "rate_limited",
                        "http_code": 429,
                        "latency_seconds": round(latency, 2),
                        "last_checked": datetime.now(timezone.utc).isoformat()
                    }
                else:
                    print(f"  [✗] {p.name}: Degraded (HTTP {resp.status_code}) - {resp.text[:100]}")
                    results[provider_id] = {
                        "status": "degraded",
                        "http_code": resp.status_code,
                        "error": resp.text[:100],
                        "last_checked": datetime.now(timezone.utc).isoformat()
                    }
        except Exception as e:
            latency = time.time() - start
            print(f"  [✗] {p.name}: Unreachable ({e})")
            results[provider_id] = {
                "status": "offline",
                "error": str(e),
                "last_checked": datetime.now(timezone.utc).isoformat()
            }

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_providers": total,
        "probed_operational": passed,
        "providers": results
    }

    OUTPUT_HEALTH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_HEALTH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[+] Health probe complete. Results saved to {OUTPUT_HEALTH}")

if __name__ == "__main__":
    run_health_checks()
