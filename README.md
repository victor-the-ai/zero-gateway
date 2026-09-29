# Zerogateway 🚀

[![PyPI version](https://img.shields.io/pypi/v/zerogateway.svg)](https://pypi.org/project/zerogateway/)
[![npm version](https://img.shields.io/npm/v/zerogateway.svg)](https://www.npmjs.com/package/zerogateway)
[![Total Free Providers](https://img.shields.io/badge/Free%20Providers-8-brightgreen.svg)](#-tracked-free-providers)
[![Total Models](https://img.shields.io/badge/Models%20Available-21-blue.svg)](#-tracked-free-providers)
[![Playground](https://img.shields.io/badge/Playground-Live%20Demo-emerald.svg)](https://victor-the-ai.github.io/zero-gateway/#playground)
[![llms.txt](https://img.shields.io/badge/llms.txt-Standard-blue.svg)](https://victor-the-ai.github.io/zero-gateway/llms.txt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A centralized Git-synced registry, unified client router (Python, TypeScript, In-Browser), and OpenAI-compatible proxy for **100% free API access to Large Language Models**.

Never let rate limits (HTTP 429) or expired promotional offers disrupt your workflow again. **Zerogateway** tracks active free tiers, aggregates quotas, auto-swaps multiple API keys, and cascades across alternate free providers behind a single OpenAI-compatible endpoint.

- 🌐 **Live Website & Playground**: [victor-the-ai.github.io/zero-gateway](https://victor-the-ai.github.io/zero-gateway/)
- 📖 **Machine-Readable AI Specs**: [`llms.txt`](https://victor-the-ai.github.io/zero-gateway/llms.txt) & [`llms-full.txt`](https://victor-the-ai.github.io/zero-gateway/llms-full.txt)

---

## 🌟 Key Features

- 📑 **Centralized Git Registry**: Community-curated YAML catalog of free LLM tiers, promotional credits, and zero-auth APIs.
- 🔄 **Zero-Downtime Cascading**: Seamlessly routes to alternate providers hosting the same model family when rate limits (HTTP 429) are encountered.
- 🔑 **Intra-Provider Multi-Key Swapping**: Provide comma-separated API keys for a provider (e.g. Gemini, Groq). If one key hits quota, it auto-swaps to the next key instantly.
- ⏱️ **Reset Window Tracking**: Extracts retry delays from `Retry-After` headers and provider error payloads (`retryDelay`) to put keys on temporary cooldown until quota resets.
- ⚡ **Local OpenAI-Compatible Proxy**: Drop-in gateway (`http://localhost:8080/v1`) for **Cursor**, **Cline**, **Continue.dev**, **LibreChat**, and **Open WebUI**.
- 🌐 **Pure In-Browser JavaScript SDK**: Standalone bundle with live browser playground and zero backend requirements for keyless testing.
- 🤖 **Automated Canary Probing**: Scheduled CI runners test endpoints daily to detect deprecated models, revoked free tiers, or payment walls.

---

## 📊 Tracked Free Providers

Currently indexing **8 providers** and **21 models** with zero credit card requirements:

| Provider | Access Model | Card Required? | Env Variable | Free Rate Limits | Supported Models |
| :--- | :--- | :---: | :--- | :--- | :--- |
| [Cerebras Inference](https://cerebras.ai) | Permanent Free | ❌ No | `CEREBRAS_API_KEY` | 30 RPM / 14400 RPD | `llama3.3-70b`, `llama3.1-8b` |
| [Google AI Studio (Gemini)](https://aistudio.google.com) | Permanent Free | ❌ No | `GEMINI_API_KEY` | 15 RPM / 1500 RPD | `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash` |
| [GroqCloud](https://groq.com) | Permanent Free | ❌ No | `GROQ_API_KEY` | 30 RPM / 14400 RPD | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b` |
| [SambaNova Cloud](https://sambanova.ai) | Permanent Free | ❌ No | `SAMBANOVA_API_KEY` | 20 RPM / 1000 RPD | `Meta-Llama-3.3-70B-Instruct`, `llama-405b` |
| [Mistral AI](https://mistral.ai) | Permanent Free | ❌ No | `MISTRAL_API_KEY` | 60 RPM / Uncapped | `codestral-latest`, `mistral-small-latest`, `open-mistral-nemo` |
| [OpenRouter Free Models](https://openrouter.ai) | Permanent Free | ❌ No | `OPENROUTER_API_KEY` | 20 RPM / 200 RPD | `deepseek-r1:free`, `llama-3.3-70b:free` |
| [GitHub Models](https://github.com/marketplace/models) | Permanent Free | ❌ No | `GITHUB_TOKEN` | 15 RPM / 150 RPD | `gpt-4o-mini`, `llama-3.3-70b` |
| [Pollinations AI](https://pollinations.ai) | No Key Required | ❌ No | *None (Zero Auth)* | 10 RPM / 500 RPD | `openai`, `mistral` |

---

## 🚀 Quickstart

### 1. Installation

**Python SDK**:
```bash
pip install zerogateway
```

**TypeScript / Node.js SDK**:
```bash
npm install zerogateway
```

### 2. Configure Your Free API Keys

In your environment or `.env` file (none are mandatory; providers without keys will run zero-auth endpoints):

```env
# Multi-key rotation: supply multiple comma-separated keys
GEMINI_API_KEY="AIzaSyKey1...,AIzaSyKey2..."
GROQ_API_KEY="gsk_key1...,gsk_key2..."
CEREBRAS_API_KEY="csk-..."
SAMBANOVA_API_KEY="..."
OPENROUTER_API_KEY="sk-or-..."
MISTRAL_API_KEY="..."
GITHUB_TOKEN="ghp_..."

# Configurable options
ENABLE_KEY_ROTATION=true
ENABLE_PROVIDER_ROTATION=true
```

---

## 🛠️ Usage Modes

### Mode A: Python SDK

```python
from zerogateway import ZeroGatewayClient

client = ZeroGatewayClient(enable_key_rotation=True)

response = client.chat.completions.create(
    model="llama-3.3-70b", # or "gemini-flash", "fast-smart", "auto"
    messages=[{"role": "user", "content": "Explain async/await in Python in 2 lines."}]
)

print(response.choices[0].message.content)
print(f"Served by: {response.provider_id}")
```

### Mode B: TypeScript / JavaScript SDK

```typescript
import { ZeroGatewayClient } from "zerogateway";

const client = new ZeroGatewayClient({
  enableKeyRotation: true,
  enableProviderRotation: true,
});

const response = await client.chat.completions.create({
  model: "llama-3.3-70b",
  messages: [{ role: "user", content: "Explain async in TypeScript in 1 line." }]
});

console.log(response.choices[0].message.content);
console.log("Served by:", response._zerogateway_meta?.provider_name);
```

### Mode C: In-Browser Standalone Bundle

```html
<script src="https://victor-the-ai.github.io/zero-gateway/zerogateway.browser.global.js"></script>
<script>
  const client = new window.ZeroGateway.ZeroGatewayClient();
  client.chat.completions.create({
    model: "openai", // Zero-auth, no API key needed
    messages: [{ role: "user", content: "Say hello!" }],
    stream: true
  }).then(async (stream) => {
    for await (const chunk of stream) {
      console.log(chunk);
    }
  });
</script>
```

### Mode D: Local Gateway Proxy (For Cursor, Cline, LibreChat)

Launch the OpenAI-compatible proxy server:

```bash
zerogateway serve --port 8080
```

Now configure your IDE (Cursor, Cline, Continue.dev):
- **Base URL**: `http://localhost:8080/v1`
- **API Key**: `zerogateway`
- **Model**: `llama-3.3-70b` (or `gpt-4o-mini`, `gemini-flash`, `auto`)

If Groq hits an HTTP 429 rate limit, the proxy automatically swaps keys or cascades to Cerebras, SambaNova, or OpenRouter with zero interruption to your editing session!

---

## 🤝 Contributing New Offers & Providers

Found a new free LLM promotion or accelerator tier? Submit a PR!

1. Create a new YAML file under `registry/providers/<provider_id>.yaml`
2. Follow the [JSON Schema](registry/schema.json)
3. Run `python scripts/compile_registry.py` to validate
4. Submit your Pull Request at [github.com/victor-the-ai/zero-gateway](https://github.com/victor-the-ai/zero-gateway).

---

## 📜 License

MIT License. Free and open source for all developers.
