#!/usr/bin/env python3
"""
Generates the comprehensive README.md from registry/index.json
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = REPO_ROOT / "registry" / "index.json"
README_FILE = REPO_ROOT / "README.md"

def generate_readme():
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    providers = data["providers"]
    stats = data["stats"]

    table_rows = []
    for p in sorted(providers, key=lambda x: x["name"]):
        name = f"[{p['name']}]({p['website']})"
        card = "❌ No" if not p["tier"]["requires_credit_card"] else "⚠️ Yes"
        tier_type = p["tier"]["type"].replace("_", " ").title()
        
        limits = p.get("limits") or {}
        rpm = f"{limits.get('requests_per_minute')} RPM" if limits.get('requests_per_minute') else "Unspecified"
        rpd = f"{limits.get('requests_per_day')} RPD" if limits.get('requests_per_day') else "Uncapped"
        rate_str = f"{rpm} / {rpd}"

        models_list = ", ".join([f"`{m['id']}`" for m in p["models"][:3]])
        if len(p["models"]) > 3:
            models_list += f" *(+{len(p['models']) - 3} more)*"

        env_var = f"`{p['api']['env_var']}`" if p['api']['env_var'] else "*None (Zero Auth)*"
        table_rows.append(f"| {name} | {tier_type} | {card} | {env_var} | {rate_str} | {models_list} |")

    table_content = "\n".join(table_rows)

    readme_content = f"""# Zerogateway 🚀

[![Registry Validation](https://github.com/zerogateway/zero-gateway/actions/workflows/validate_registry.yml/badge.svg)](https://github.com/zerogateway/zero-gateway/actions)
[![Canary Health Probes](https://github.com/zerogateway/zero-gateway/actions/workflows/health_check.yml/badge.svg)](https://github.com/zerogateway/zero-gateway/actions)
[![Total Free Providers](https://img.shields.io/badge/Free%20Providers-{stats['total_providers']}-brightgreen.svg)](#tracked-free-providers)
[![Total Models](https://img.shields.io/badge/Models%20Available-{stats['total_models']}-blue.svg)](#tracked-free-providers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A centralized Git-synced registry and unified client router for **100% free API access to Large Language Models**.

Never let rate limits (HTTP 429) or expired promotional offers disrupt your workflow again. **Zerogateway** tracks active free tiers, aggregates quotas, and cascades across multiple free providers behind a single OpenAI-compatible endpoint.

---

## 🌟 Key Features

- 📑 **Centralized Git Registry**: Community-curated YAML catalog of free LLM tiers, promotional credits, and zero-auth APIs.
- 🔄 **Smart Fallback & Cascading**: Seamlessly routes to alternate providers hosting the same model family when rate limits (HTTP 429) are encountered.
- ⚡ **Local OpenAI-Compatible Proxy**: Drop-in gateway (`http://localhost:8080/v1`) for **Cursor**, **Cline**, **Continue.dev**, **LibreChat**, and **Open WebUI**.
- 🤖 **Automated Canary Probing**: Scheduled CI runners test endpoints daily to detect deprecated models, revoked free tiers, or payment walls.
- 🔑 **Flexible BYOK & Zero-Auth**: Use your own free API keys or start immediately with zero-auth public endpoints.

---

## 📊 Tracked Free Providers

Currently indexing **{stats['total_providers']} providers** and **{stats['total_models']} models**:

| Provider | Access Model | Card Required? | Env Variable | Free Rate Limits | Supported Models |
| :--- | :--- | :---: | :--- | :--- | :--- |
{table_content}

---

## 🚀 Quickstart

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/zerogateway/zero-gateway.git
cd zero-gateway

# Set up virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -e ./sdk/python
```

### 2. Configure Your Free API Keys

Copy the example environment configuration:

```bash
cp .env.example .env
```

Add whatever free keys you have acquired (none are mandatory; providers without keys will be skipped or run via zero-auth):

```env
GROQ_API_KEY="gsk_..."
CEREBRAS_API_KEY="csk-..."
SAMBANOVA_API_KEY="..."
GEMINI_API_KEY="AIzaSy..."
OPENROUTER_API_KEY="sk-or-..."
MISTRAL_API_KEY="..."
GITHUB_TOKEN="ghp_..."
```

---

## 🛠️ Usage Modes

### Mode A: Python SDK

```python
from zerogateway import ZeroGatewayClient

client = ZeroGatewayClient()

# Request using model alias or exact model ID
# The router automatically selects an active free provider with available quota
response = client.chat.completions.create(
    model="llama-3.3-70b", # or aliases: "fast-smart", "gemini-flash"
    messages=[{{"role": "user", "content": "Explain async/await in Python in 2 lines."}}]
)

print(response.choices[0].message.content)
print(f"Served by: {{response.provider_id}}")
```

### Mode B: Local Gateway Proxy (For Cursor, Cline, LibreChat)

Launch the OpenAI-compatible proxy server:

```bash
zerogateway serve --port 8080
```

Now point your favorite tool to `http://localhost:8080/v1`:
- **Base URL**: `http://localhost:8080/v1`
- **API Key**: `zerogateway`
- **Model**: `llama-3.3-70b` (or `gpt-4o-mini`, `gemini-flash`, `auto`)

If Groq hits a rate limit, the proxy automatically falls back to Cerebras, SambaNova, or OpenRouter with zero interruption to your editing session!

---

## 🤝 Contributing New Offers & Providers

Found a new free LLM promotion or accelerator tier? Submit a PR!

1. Create a new YAML file under `registry/providers/<provider_id>.yaml`
2. Follow the [JSON Schema](registry/schema.json)
3. Run `python scripts/compile_registry.py` to validate
4. Submit your Pull Request. Our CI pipeline will automatically verify the schema and run a canary test.

---

## 📜 License

MIT License. Free and open source for all developers.
"""

    with open(README_FILE, "w", encoding="utf-8") as f:
        f.write(readme_content)

    print(f"[+] Successfully generated {README_FILE}")

if __name__ == "__main__":
    generate_readme()
