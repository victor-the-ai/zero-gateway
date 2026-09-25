# Free LLM Access Hub & Router 🚀

[![Registry Validation](https://github.com/free-llm-hub/free-llm-hub/actions/workflows/validate_registry.yml/badge.svg)](https://github.com/free-llm-hub/free-llm-hub/actions)
[![Canary Health Probes](https://github.com/free-llm-hub/free-llm-hub/actions/workflows/health_check.yml/badge.svg)](https://github.com/free-llm-hub/free-llm-hub/actions)
[![Total Free Providers](https://img.shields.io/badge/Free%20Providers-8-brightgreen.svg)](#tracked-free-providers)
[![Total Models](https://img.shields.io/badge/Models%20Available-21-blue.svg)](#tracked-free-providers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A centralized Git-synced registry and unified client router for **100% free API access to Large Language Models**.

Never let rate limits (HTTP 429) or expired promotional offers disrupt your workflow again. **Free LLM Hub** tracks active free tiers, aggregates quotas, and cascades across multiple free providers behind a single OpenAI-compatible endpoint.

---

## 🌟 Key Features

- 📑 **Centralized Git Registry**: Community-curated YAML catalog of free LLM tiers, promotional credits, and zero-auth APIs.
- 🔄 **Smart Fallback & Cascading**: Seamlessly routes to alternate providers hosting the same model family when rate limits (HTTP 429) are encountered.
- ⚡ **Local OpenAI-Compatible Proxy**: Drop-in gateway (`http://localhost:8080/v1`) for **Cursor**, **Cline**, **Continue.dev**, **LibreChat**, and **Open WebUI**.
- 🤖 **Automated Canary Probing**: Scheduled CI runners test endpoints daily to detect deprecated models, revoked free tiers, or payment walls.
- 🔑 **Flexible BYOK & Zero-Auth**: Use your own free API keys or start immediately with zero-auth public endpoints.

---

## 📊 Tracked Free Providers

Currently indexing **8 providers** and **21 models**:

| Provider | Access Model | Card Required? | Env Variable | Free Rate Limits | Supported Models |
| :--- | :--- | :---: | :--- | :--- | :--- |
| [Cerebras Inference](https://cerebras.ai) | Permanent Free | ❌ No | `CEREBRAS_API_KEY` | 30 RPM / 14400 RPD | `llama3.3-70b`, `llama3.1-8b` |
| [GitHub Models (Marketplace Free Tier)](https://github.com/marketplace/models) | Permanent Free | ❌ No | `GITHUB_TOKEN` | 15 RPM / 150 RPD | `gpt-4o-mini`, `Meta-Llama-3.3-70B-Instruct` |
| [Google AI Studio (Gemini Free Tier)](https://aistudio.google.com) | Permanent Free | ❌ No | `GEMINI_API_KEY` | 15 RPM / 1500 RPD | `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash` |
| [GroqCloud](https://groq.com) | Permanent Free | ❌ No | `GROQ_API_KEY` | 30 RPM / 14400 RPD | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768` |
| [Mistral AI (Free Experimentation Tier)](https://mistral.ai) | Permanent Free | ❌ No | `MISTRAL_API_KEY` | 60 RPM / Uncapped | `codestral-latest`, `mistral-small-latest`, `open-mistral-nemo` |
| [OpenRouter Free Models](https://openrouter.ai) | Permanent Free | ❌ No | `OPENROUTER_API_KEY` | 20 RPM / 200 RPD | `meta-llama/llama-3.3-70b-instruct:free`, `deepseek/deepseek-r1:free`, `mistralai/mistral-7b-instruct:free` |
| [Pollinations AI](https://pollinations.ai) | No Key Required | ❌ No | *None (Zero Auth)* | 10 RPM / 500 RPD | `openai`, `mistral` |
| [SambaNova Cloud](https://sambanova.ai) | Permanent Free | ❌ No | `SAMBANOVA_API_KEY` | 20 RPM / 1000 RPD | `Meta-Llama-3.3-70B-Instruct`, `Meta-Llama-3.1-8B-Instruct`, `Meta-Llama-3.1-405B-Instruct` |

---

## 🚀 Quickstart

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/free-llm-hub.git
cd free-llm-hub

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
from free_llm import FreeLLMClient

client = FreeLLMClient()

# Request using model alias or exact model ID
# The router automatically selects an active free provider with available quota
response = client.chat.completions.create(
    model="llama-3.3-70b", # or aliases: "fast-smart", "gemini-flash"
    messages=[{"role": "user", "content": "Explain async/await in Python in 2 lines."}]
)

print(response.choices[0].message.content)
print(f"Served by: {response.provider_id}")
```

### Mode B: Local Gateway Proxy (For Cursor, Cline, LibreChat)

Launch the OpenAI-compatible proxy server:

```bash
free-llm serve --port 8080
```

Now point your favorite tool to `http://localhost:8080/v1`:
- **Base URL**: `http://localhost:8080/v1`
- **API Key**: `free-llm`
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
