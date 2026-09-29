"use strict";
var ZeroGateway = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    BrowserRegistryManager: () => BrowserRegistryManager,
    BrowserZeroGatewayClient: () => BrowserZeroGatewayClient,
    BrowserZeroGatewayRouter: () => BrowserZeroGatewayRouter,
    RegistryManager: () => RegistryManager,
    ZeroGatewayClient: () => ZeroGatewayClient,
    ZeroGatewayRouter: () => ZeroGatewayRouter,
    extractResetWindow: () => extractResetWindow
  });

  // data/index.json
  var data_default = {
    version: "1.0.0",
    generated_at: "2026-09-25T08:44:39.237590+00:00",
    stats: {
      total_providers: 8,
      total_models: 21,
      unique_aliases: 25
    },
    alias_routing_table: {
      "llama-3.3-70b": [
        {
          provider_id: "cerebras",
          model_id: "llama3.3-70b",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e4,
            tokens_per_day: 1e6,
            concurrency: 5
          }
        },
        {
          provider_id: "github_models",
          model_id: "Meta-Llama-3.3-70B-Instruct",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 150,
            tokens_per_minute: 8e3,
            tokens_per_day: null,
            concurrency: 1
          }
        },
        {
          provider_id: "groq",
          model_id: "llama-3.3-70b-versatile",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e3,
            tokens_per_day: 5e5,
            concurrency: 5
          }
        },
        {
          provider_id: "openrouter",
          model_id: "meta-llama/llama-3.3-70b-instruct:free",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 200,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 2
          }
        },
        {
          provider_id: "sambanova",
          model_id: "Meta-Llama-3.3-70B-Instruct",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 1e3,
            tokens_per_minute: 1e4,
            tokens_per_day: 2e5,
            concurrency: 2
          }
        }
      ],
      "fast-smart": [
        {
          provider_id: "cerebras",
          model_id: "llama3.3-70b",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e4,
            tokens_per_day: 1e6,
            concurrency: 5
          }
        },
        {
          provider_id: "github_models",
          model_id: "gpt-4o-mini",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 150,
            tokens_per_minute: 8e3,
            tokens_per_day: null,
            concurrency: 1
          }
        },
        {
          provider_id: "google_ai_studio",
          model_id: "gemini-2.5-flash",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 1500,
            tokens_per_minute: 1e6,
            tokens_per_day: null,
            concurrency: 5
          }
        },
        {
          provider_id: "groq",
          model_id: "llama-3.3-70b-versatile",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e3,
            tokens_per_day: 5e5,
            concurrency: 5
          }
        },
        {
          provider_id: "mistral",
          model_id: "mistral-small-latest",
          limits: {
            requests_per_minute: 60,
            requests_per_day: null,
            tokens_per_minute: 5e5,
            tokens_per_day: null,
            concurrency: 2
          }
        },
        {
          provider_id: "openrouter",
          model_id: "meta-llama/llama-3.3-70b-instruct:free",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 200,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 2
          }
        },
        {
          provider_id: "pollinations",
          model_id: "openai",
          limits: {
            requests_per_minute: 10,
            requests_per_day: 500,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 1
          }
        },
        {
          provider_id: "sambanova",
          model_id: "Meta-Llama-3.3-70B-Instruct",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 1e3,
            tokens_per_minute: 1e4,
            tokens_per_day: 2e5,
            concurrency: 2
          }
        }
      ],
      "llama-3.1-8b": [
        {
          provider_id: "cerebras",
          model_id: "llama3.1-8b",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e4,
            tokens_per_day: 1e6,
            concurrency: 5
          }
        },
        {
          provider_id: "groq",
          model_id: "llama-3.1-8b-instant",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e3,
            tokens_per_day: 5e5,
            concurrency: 5
          }
        },
        {
          provider_id: "sambanova",
          model_id: "Meta-Llama-3.1-8B-Instruct",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 1e3,
            tokens_per_minute: 1e4,
            tokens_per_day: 2e5,
            concurrency: 2
          }
        }
      ],
      "ultra-fast": [
        {
          provider_id: "cerebras",
          model_id: "llama3.1-8b",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e4,
            tokens_per_day: 1e6,
            concurrency: 5
          }
        },
        {
          provider_id: "groq",
          model_id: "llama-3.1-8b-instant",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e3,
            tokens_per_day: 5e5,
            concurrency: 5
          }
        },
        {
          provider_id: "sambanova",
          model_id: "Meta-Llama-3.1-8B-Instruct",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 1e3,
            tokens_per_minute: 1e4,
            tokens_per_day: 2e5,
            concurrency: 2
          }
        }
      ],
      "gpt-4o-mini": [
        {
          provider_id: "github_models",
          model_id: "gpt-4o-mini",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 150,
            tokens_per_minute: 8e3,
            tokens_per_day: null,
            concurrency: 1
          }
        },
        {
          provider_id: "pollinations",
          model_id: "openai",
          limits: {
            requests_per_minute: 10,
            requests_per_day: 500,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 1
          }
        }
      ],
      general: [
        {
          provider_id: "github_models",
          model_id: "Meta-Llama-3.3-70B-Instruct",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 150,
            tokens_per_minute: 8e3,
            tokens_per_day: null,
            concurrency: 1
          }
        },
        {
          provider_id: "groq",
          model_id: "llama-3.3-70b-versatile",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e3,
            tokens_per_day: 5e5,
            concurrency: 5
          }
        }
      ],
      "gemini-flash": [
        {
          provider_id: "google_ai_studio",
          model_id: "gemini-2.5-flash",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 1500,
            tokens_per_minute: 1e6,
            tokens_per_day: null,
            concurrency: 5
          }
        }
      ],
      multimodal: [
        {
          provider_id: "google_ai_studio",
          model_id: "gemini-2.5-flash",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 1500,
            tokens_per_minute: 1e6,
            tokens_per_day: null,
            concurrency: 5
          }
        }
      ],
      "gemini-flash-2": [
        {
          provider_id: "google_ai_studio",
          model_id: "gemini-2.0-flash",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 1500,
            tokens_per_minute: 1e6,
            tokens_per_day: null,
            concurrency: 5
          }
        }
      ],
      "fast-agent": [
        {
          provider_id: "google_ai_studio",
          model_id: "gemini-2.0-flash",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 1500,
            tokens_per_minute: 1e6,
            tokens_per_day: null,
            concurrency: 5
          }
        }
      ],
      "gemini-1.5-flash": [
        {
          provider_id: "google_ai_studio",
          model_id: "gemini-1.5-flash",
          limits: {
            requests_per_minute: 15,
            requests_per_day: 1500,
            tokens_per_minute: 1e6,
            tokens_per_day: null,
            concurrency: 5
          }
        }
      ],
      small: [
        {
          provider_id: "groq",
          model_id: "llama-3.1-8b-instant",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e3,
            tokens_per_day: 5e5,
            concurrency: 5
          }
        },
        {
          provider_id: "mistral",
          model_id: "open-mistral-nemo",
          limits: {
            requests_per_minute: 60,
            requests_per_day: null,
            tokens_per_minute: 5e5,
            tokens_per_day: null,
            concurrency: 2
          }
        },
        {
          provider_id: "openrouter",
          model_id: "mistralai/mistral-7b-instruct:free",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 200,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      "mixtral-8x7b": [
        {
          provider_id: "groq",
          model_id: "mixtral-8x7b-32768",
          limits: {
            requests_per_minute: 30,
            requests_per_day: 14400,
            tokens_per_minute: 6e3,
            tokens_per_day: 5e5,
            concurrency: 5
          }
        }
      ],
      codestral: [
        {
          provider_id: "mistral",
          model_id: "codestral-latest",
          limits: {
            requests_per_minute: 60,
            requests_per_day: null,
            tokens_per_minute: 5e5,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      code: [
        {
          provider_id: "mistral",
          model_id: "codestral-latest",
          limits: {
            requests_per_minute: 60,
            requests_per_day: null,
            tokens_per_minute: 5e5,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      "fast-code": [
        {
          provider_id: "mistral",
          model_id: "codestral-latest",
          limits: {
            requests_per_minute: 60,
            requests_per_day: null,
            tokens_per_minute: 5e5,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      "mistral-small": [
        {
          provider_id: "mistral",
          model_id: "mistral-small-latest",
          limits: {
            requests_per_minute: 60,
            requests_per_day: null,
            tokens_per_minute: 5e5,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      "mistral-nemo": [
        {
          provider_id: "mistral",
          model_id: "open-mistral-nemo",
          limits: {
            requests_per_minute: 60,
            requests_per_day: null,
            tokens_per_minute: 5e5,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      "deepseek-r1": [
        {
          provider_id: "openrouter",
          model_id: "deepseek/deepseek-r1:free",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 200,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      reasoning: [
        {
          provider_id: "openrouter",
          model_id: "deepseek/deepseek-r1:free",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 200,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      "mistral-7b": [
        {
          provider_id: "openrouter",
          model_id: "mistralai/mistral-7b-instruct:free",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 200,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 2
          }
        }
      ],
      "zero-auth": [
        {
          provider_id: "pollinations",
          model_id: "openai",
          limits: {
            requests_per_minute: 10,
            requests_per_day: 500,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 1
          }
        },
        {
          provider_id: "pollinations",
          model_id: "mistral",
          limits: {
            requests_per_minute: 10,
            requests_per_day: 500,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 1
          }
        }
      ],
      mistral: [
        {
          provider_id: "pollinations",
          model_id: "mistral",
          limits: {
            requests_per_minute: 10,
            requests_per_day: 500,
            tokens_per_minute: null,
            tokens_per_day: null,
            concurrency: 1
          }
        }
      ],
      "llama-3.1-405b": [
        {
          provider_id: "sambanova",
          model_id: "Meta-Llama-3.1-405B-Instruct",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 1e3,
            tokens_per_minute: 1e4,
            tokens_per_day: 2e5,
            concurrency: 2
          }
        }
      ],
      frontier: [
        {
          provider_id: "sambanova",
          model_id: "Meta-Llama-3.1-405B-Instruct",
          limits: {
            requests_per_minute: 20,
            requests_per_day: 1e3,
            tokens_per_minute: 1e4,
            tokens_per_day: 2e5,
            concurrency: 2
          }
        }
      ]
    },
    providers: [
      {
        id: "cerebras",
        name: "Cerebras Inference",
        website: "https://cerebras.ai",
        console_url: "https://cloud.cerebras.ai/platform/",
        status: "active",
        tier: {
          type: "permanent_free",
          requires_credit_card: false,
          auth_type: "api_key",
          signup_methods: [
            "github",
            "google",
            "email"
          ],
          promo_details: {
            expires_at: null,
            initial_credits_usd: 0,
            promo_code: null,
            notes: "World's fastest LLaMA inference speeds (1000+ tokens/sec) on CS-3 wafer-scale engine."
          }
        },
        api: {
          format: "openai_compatible",
          base_url: "https://api.cerebras.ai/v1",
          env_var: "CEREBRAS_API_KEY",
          default_headers: {}
        },
        limits: {
          requests_per_minute: 30,
          requests_per_day: 14400,
          tokens_per_minute: 6e4,
          tokens_per_day: 1e6,
          concurrency: 5
        },
        models: [
          {
            id: "llama3.3-70b",
            display_name: "LLaMA 3.3 70B",
            aliases: [
              "llama-3.3-70b",
              "fast-smart"
            ],
            context_window: 8192,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "llama3.1-8b",
            display_name: "LLaMA 3.1 8B",
            aliases: [
              "llama-3.1-8b",
              "ultra-fast"
            ],
            context_window: 8192,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          }
        ]
      },
      {
        id: "github_models",
        name: "GitHub Models (Marketplace Free Tier)",
        website: "https://github.com/marketplace/models",
        console_url: "https://github.com/settings/tokens",
        status: "active",
        tier: {
          type: "permanent_free",
          requires_credit_card: false,
          auth_type: "api_key",
          signup_methods: [
            "github"
          ],
          promo_details: {
            expires_at: null,
            initial_credits_usd: 0,
            promo_code: null,
            notes: "Free playground & API for GitHub users using standard GitHub Personal Access Tokens (PAT). Offers GPT-4o, Claude 3.5 Sonnet, and Llama 3.3."
          }
        },
        api: {
          format: "openai_compatible",
          base_url: "https://models.inference.ai.azure.com",
          env_var: "GITHUB_TOKEN",
          default_headers: {}
        },
        limits: {
          requests_per_minute: 15,
          requests_per_day: 150,
          tokens_per_minute: 8e3,
          tokens_per_day: null,
          concurrency: 1
        },
        models: [
          {
            id: "gpt-4o-mini",
            display_name: "OpenAI GPT-4o Mini",
            aliases: [
              "gpt-4o-mini",
              "fast-smart"
            ],
            context_window: 128e3,
            supports_tools: true,
            supports_vision: true,
            supports_streaming: true
          },
          {
            id: "Meta-Llama-3.3-70B-Instruct",
            display_name: "Meta LLaMA 3.3 70B Instruct",
            aliases: [
              "llama-3.3-70b",
              "general"
            ],
            context_window: 64e3,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          }
        ]
      },
      {
        id: "google_ai_studio",
        name: "Google AI Studio (Gemini Free Tier)",
        website: "https://aistudio.google.com",
        console_url: "https://aistudio.google.com/app/apikey",
        status: "active",
        tier: {
          type: "permanent_free",
          requires_credit_card: false,
          auth_type: "api_key",
          signup_methods: [
            "google"
          ],
          promo_details: {
            expires_at: null,
            initial_credits_usd: 0,
            promo_code: null,
            notes: "Official free tier from Google with massive context windows (1M-2M tokens) and multimodal support."
          }
        },
        api: {
          format: "openai_compatible",
          base_url: "https://generativelanguage.googleapis.com/v1beta/openai/",
          env_var: "GEMINI_API_KEY",
          default_headers: {}
        },
        limits: {
          requests_per_minute: 15,
          requests_per_day: 1500,
          tokens_per_minute: 1e6,
          tokens_per_day: null,
          concurrency: 5
        },
        models: [
          {
            id: "gemini-2.5-flash",
            display_name: "Gemini 2.5 Flash",
            aliases: [
              "gemini-flash",
              "fast-smart",
              "multimodal"
            ],
            context_window: 1048576,
            supports_tools: true,
            supports_vision: true,
            supports_streaming: true
          },
          {
            id: "gemini-2.0-flash",
            display_name: "Gemini 2.0 Flash",
            aliases: [
              "gemini-flash-2",
              "fast-agent"
            ],
            context_window: 1048576,
            supports_tools: true,
            supports_vision: true,
            supports_streaming: true
          },
          {
            id: "gemini-1.5-flash",
            display_name: "Gemini 1.5 Flash",
            aliases: [
              "gemini-1.5-flash"
            ],
            context_window: 1048576,
            supports_tools: true,
            supports_vision: true,
            supports_streaming: true
          }
        ]
      },
      {
        id: "groq",
        name: "GroqCloud",
        website: "https://groq.com",
        console_url: "https://console.groq.com/keys",
        status: "active",
        tier: {
          type: "permanent_free",
          requires_credit_card: false,
          auth_type: "api_key",
          signup_methods: [
            "github",
            "google",
            "email"
          ],
          promo_details: {
            expires_at: null,
            initial_credits_usd: 0,
            promo_code: null,
            notes: "High speed LPU inference with generous free tier RPM/TPM limits on open source models."
          }
        },
        api: {
          format: "openai_compatible",
          base_url: "https://api.groq.com/openai/v1",
          env_var: "GROQ_API_KEY",
          default_headers: {}
        },
        limits: {
          requests_per_minute: 30,
          requests_per_day: 14400,
          tokens_per_minute: 6e3,
          tokens_per_day: 5e5,
          concurrency: 5
        },
        models: [
          {
            id: "llama-3.3-70b-versatile",
            display_name: "LLaMA 3.3 70B Versatile",
            aliases: [
              "llama-3.3-70b",
              "fast-smart",
              "general"
            ],
            context_window: 128e3,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "llama-3.1-8b-instant",
            display_name: "LLaMA 3.1 8B Instant",
            aliases: [
              "llama-3.1-8b",
              "ultra-fast",
              "small"
            ],
            context_window: 128e3,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "mixtral-8x7b-32768",
            display_name: "Mixtral 8x7B Instruct",
            aliases: [
              "mixtral-8x7b"
            ],
            context_window: 32768,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          }
        ]
      },
      {
        id: "mistral",
        name: "Mistral AI (Free Experimentation Tier)",
        website: "https://mistral.ai",
        console_url: "https://console.mistral.ai/api-keys/",
        status: "active",
        tier: {
          type: "permanent_free",
          requires_credit_card: false,
          auth_type: "api_key",
          signup_methods: [
            "github",
            "google",
            "email"
          ],
          promo_details: {
            expires_at: null,
            initial_credits_usd: 0,
            promo_code: null,
            notes: "Official free tier for testing and experimentation across open and frontier Mistral models."
          }
        },
        api: {
          format: "openai_compatible",
          base_url: "https://api.mistral.ai/v1",
          env_var: "MISTRAL_API_KEY",
          default_headers: {}
        },
        limits: {
          requests_per_minute: 60,
          requests_per_day: null,
          tokens_per_minute: 5e5,
          tokens_per_day: null,
          concurrency: 2
        },
        models: [
          {
            id: "codestral-latest",
            display_name: "Codestral",
            aliases: [
              "codestral",
              "code",
              "fast-code"
            ],
            context_window: 256e3,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "mistral-small-latest",
            display_name: "Mistral Small",
            aliases: [
              "mistral-small",
              "fast-smart"
            ],
            context_window: 128e3,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "open-mistral-nemo",
            display_name: "Mistral NeMo",
            aliases: [
              "mistral-nemo",
              "small"
            ],
            context_window: 128e3,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          }
        ]
      },
      {
        id: "openrouter",
        name: "OpenRouter Free Models",
        website: "https://openrouter.ai",
        console_url: "https://openrouter.ai/settings/keys",
        status: "active",
        tier: {
          type: "permanent_free",
          requires_credit_card: false,
          auth_type: "api_key",
          signup_methods: [
            "github",
            "google",
            "email"
          ],
          promo_details: {
            expires_at: null,
            initial_credits_usd: 0,
            promo_code: null,
            notes: "Aggregator hosting multiple models with ':free' suffix. Completely free to use with zero balance."
          }
        },
        api: {
          format: "openai_compatible",
          base_url: "https://openrouter.ai/api/v1",
          env_var: "OPENROUTER_API_KEY",
          default_headers: {
            "HTTP-Referer": "https://github.com/free-llm-hub",
            "X-Title": "Free LLM Hub"
          }
        },
        limits: {
          requests_per_minute: 20,
          requests_per_day: 200,
          tokens_per_minute: null,
          tokens_per_day: null,
          concurrency: 2
        },
        models: [
          {
            id: "meta-llama/llama-3.3-70b-instruct:free",
            display_name: "LLaMA 3.3 70B (Free Tier)",
            aliases: [
              "llama-3.3-70b",
              "fast-smart"
            ],
            context_window: 131072,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "deepseek/deepseek-r1:free",
            display_name: "DeepSeek R1 (Free Tier)",
            aliases: [
              "deepseek-r1",
              "reasoning"
            ],
            context_window: 64e3,
            supports_tools: false,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "mistralai/mistral-7b-instruct:free",
            display_name: "Mistral 7B Instruct (Free Tier)",
            aliases: [
              "mistral-7b",
              "small"
            ],
            context_window: 32768,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          }
        ]
      },
      {
        id: "pollinations",
        name: "Pollinations AI",
        website: "https://pollinations.ai",
        console_url: "https://pollinations.ai",
        status: "active",
        tier: {
          type: "no_key_required",
          requires_credit_card: false,
          auth_type: "none",
          signup_methods: [],
          promo_details: {
            expires_at: null,
            initial_credits_usd: 0,
            promo_code: null,
            notes: "Public free inference without requiring any API key or registration. Great for instant zero-config testing."
          }
        },
        api: {
          format: "openai_compatible",
          base_url: "https://text.pollinations.ai/openai",
          env_var: null,
          default_headers: {}
        },
        limits: {
          requests_per_minute: 10,
          requests_per_day: 500,
          tokens_per_minute: null,
          tokens_per_day: null,
          concurrency: 1
        },
        models: [
          {
            id: "openai",
            display_name: "GPT-4o Mini (Pollinations)",
            aliases: [
              "gpt-4o-mini",
              "fast-smart",
              "zero-auth"
            ],
            context_window: 32e3,
            supports_tools: false,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "mistral",
            display_name: "Mistral Nemo (Pollinations)",
            aliases: [
              "mistral",
              "zero-auth"
            ],
            context_window: 32e3,
            supports_tools: false,
            supports_vision: false,
            supports_streaming: true
          }
        ]
      },
      {
        id: "sambanova",
        name: "SambaNova Cloud",
        website: "https://sambanova.ai",
        console_url: "https://cloud.sambanova.ai/apis",
        status: "active",
        tier: {
          type: "permanent_free",
          requires_credit_card: false,
          auth_type: "api_key",
          signup_methods: [
            "github",
            "google",
            "email"
          ],
          promo_details: {
            expires_at: null,
            initial_credits_usd: 0,
            promo_code: null,
            notes: "High speed SN40L chip inference. Supports full 70B and 405B models plus DeepSeek."
          }
        },
        api: {
          format: "openai_compatible",
          base_url: "https://api.sambanova.ai/v1",
          env_var: "SAMBANOVA_API_KEY",
          default_headers: {}
        },
        limits: {
          requests_per_minute: 20,
          requests_per_day: 1e3,
          tokens_per_minute: 1e4,
          tokens_per_day: 2e5,
          concurrency: 2
        },
        models: [
          {
            id: "Meta-Llama-3.3-70B-Instruct",
            display_name: "LLaMA 3.3 70B Instruct",
            aliases: [
              "llama-3.3-70b",
              "fast-smart"
            ],
            context_window: 8192,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "Meta-Llama-3.1-8B-Instruct",
            display_name: "LLaMA 3.1 8B Instruct",
            aliases: [
              "llama-3.1-8b",
              "ultra-fast"
            ],
            context_window: 8192,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          },
          {
            id: "Meta-Llama-3.1-405B-Instruct",
            display_name: "LLaMA 3.1 405B Instruct",
            aliases: [
              "llama-3.1-405b",
              "frontier"
            ],
            context_window: 8192,
            supports_tools: true,
            supports_vision: false,
            supports_streaming: true
          }
        ]
      }
    ]
  };

  // src/utils.ts
  function extractResetWindow(headers, body, defaultCooldown = 60) {
    const getHeader = (name) => {
      if (!headers) return null;
      if (typeof headers.get === "function") {
        return headers.get(name);
      }
      return headers[name] || headers[name.toLowerCase()] || null;
    };
    const retryAfter = getHeader("retry-after");
    if (retryAfter) {
      const val = parseFloat(retryAfter);
      if (!isNaN(val) && val > 0) {
        return val;
      }
    }
    for (const h of ["x-ratelimit-reset", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens"]) {
      const rVal = getHeader(h);
      if (rVal) {
        const val = parseFloat(rVal);
        if (!isNaN(val)) {
          if (val > 1e9) {
            const remaining = Math.max(1, (val * 1e3 - Date.now()) / 1e3);
            return remaining;
          } else if (val > 0) {
            return val;
          }
        }
      }
    }
    if (body && typeof body === "object") {
      const error = body.error;
      if (error && typeof error === "object") {
        const details = error.details;
        if (Array.isArray(details)) {
          for (const d of details) {
            if (d && typeof d === "object" && typeof d.retryDelay === "string") {
              const delayStr = d.retryDelay.replace(/s$/i, "");
              const val = parseFloat(delayStr);
              if (!isNaN(val) && val > 0) {
                return val;
              }
            }
          }
        }
        if (typeof error.retry_after === "number" || typeof error.retry_after === "string") {
          const val = parseFloat(String(error.retry_after));
          if (!isNaN(val) && val > 0) {
            return val;
          }
        }
        const msg = String(error.message || "");
        const match = msg.match(/retry after\s+([0-9.]+)\s*s?/i);
        if (match && match[1]) {
          const val = parseFloat(match[1]);
          if (!isNaN(val) && val > 0) {
            return val;
          }
        }
      }
    }
    return defaultCooldown;
  }

  // src/browser.ts
  var BrowserRegistryManager = class {
    registryUrl;
    autoSync;
    _data;
    constructor(registryUrl, autoSync = true) {
      this.registryUrl = registryUrl || "https://raw.githubusercontent.com/victor-the-ai/zero-gateway/main/registry/index.json";
      this.autoSync = autoSync;
      this.load();
    }
    get data() {
      if (!this._data) this.load();
      return this._data;
    }
    load() {
      if (typeof localStorage !== "undefined") {
        try {
          const cached = localStorage.getItem("zerogateway_registry");
          if (cached) {
            this._data = JSON.parse(cached);
            return this._data;
          }
        } catch {
        }
      }
      this._data = data_default;
      return this._data;
    }
    async sync() {
      try {
        const res = await fetch(this.registryUrl);
        if (res.ok) {
          const data = await res.json();
          if (typeof localStorage !== "undefined") {
            try {
              localStorage.setItem("zerogateway_registry", JSON.stringify(data));
            } catch {
            }
          }
          this._data = data;
        }
      } catch {
      }
    }
    getProvider(id) {
      return this.data.providers.find((p) => p.id === id);
    }
    getProvidersForAlias(alias) {
      return this.data.alias_routing_table[alias] || [];
    }
    getAllModels() {
      const models = [];
      for (const p of this.data.providers) {
        for (const m of p.models) {
          models.push({
            id: m.id,
            display_name: m.display_name,
            aliases: m.aliases,
            provider_id: p.id,
            provider_name: p.name
          });
        }
      }
      return models;
    }
  };
  var BrowserZeroGatewayRouter = class {
    registry;
    enableKeyRotation;
    enableProviderRotation;
    customApiKeys;
    defaultCooldown;
    throttledUntil = /* @__PURE__ */ new Map();
    keyThrottledUntil = /* @__PURE__ */ new Map();
    stats = /* @__PURE__ */ new Map();
    constructor(options = {}) {
      this.registry = options.registry || new BrowserRegistryManager();
      this.customApiKeys = options.apiKeys || {};
      this.defaultCooldown = options.defaultCooldown ?? 60;
      this.enableKeyRotation = options.enableKeyRotation ?? false;
      this.enableProviderRotation = options.enableProviderRotation ?? true;
    }
    getProviderKeys(provider) {
      const candidateKeys = [
        provider.id,
        provider.id.replace(/_/g, ""),
        provider.name.toLowerCase()
      ];
      if (provider.api.env_var) {
        candidateKeys.push(
          provider.api.env_var,
          provider.api.env_var.toLowerCase(),
          provider.api.env_var.replace(/_API_KEY|_TOKEN/gi, "").toLowerCase()
        );
      }
      if (provider.id === "google_ai_studio") candidateKeys.push("gemini", "google", "gemini_api_key");
      if (provider.id === "github_models") candidateKeys.push("github", "github_token");
      for (const k of candidateKeys) {
        if (this.customApiKeys[k] && this.customApiKeys[k].length > 0) {
          return [...this.customApiKeys[k]];
        }
      }
      return [];
    }
    isProviderConfigured(provider) {
      if (provider.tier.auth_type === "none" || !provider.api.env_var) {
        return true;
      }
      return this.getProviderKeys(provider).length > 0;
    }
    getConfiguredProviders() {
      return this.registry.data.providers.filter(
        (p) => p.status === "active" && this.isProviderConfigured(p)
      );
    }
    isThrottled(providerId) {
      return Date.now() < (this.throttledUntil.get(providerId) || 0);
    }
    isKeyThrottled(providerId, key) {
      return Date.now() < (this.keyThrottledUntil.get(`${providerId}:${key}`) || 0);
    }
    markThrottled(providerId, cooldownSeconds = 60) {
      this.throttledUntil.set(providerId, Date.now() + cooldownSeconds * 1e3);
    }
    markKeyThrottled(providerId, key, cooldownSeconds = 60) {
      this.keyThrottledUntil.set(`${providerId}:${key}`, Date.now() + cooldownSeconds * 1e3);
    }
    resolveCandidates(requestedModel) {
      const candidates = [];
      const modelReq = requestedModel.trim();
      if (modelReq === "auto" || modelReq === "default") {
        for (const p of this.getConfiguredProviders()) {
          if (p.models && p.models.length > 0) {
            candidates.push([p, p.models[0].id]);
          }
        }
        return this.sortCandidates(candidates);
      }
      const matches = this.registry.getProvidersForAlias(modelReq);
      for (const m of matches) {
        const p = this.registry.getProvider(m.provider_id);
        if (p && this.isProviderConfigured(p)) {
          candidates.push([p, m.model_id]);
        }
      }
      if (candidates.length === 0) {
        for (const p of this.getConfiguredProviders()) {
          for (const m of p.models) {
            if (m.id.toLowerCase() === modelReq.toLowerCase()) {
              candidates.push([p, m.id]);
            }
          }
        }
      }
      if (candidates.length === 0) {
        for (const p of this.getConfiguredProviders()) {
          for (const m of p.models) {
            if (m.id.toLowerCase().includes(modelReq.toLowerCase())) {
              candidates.push([p, m.id]);
            }
          }
        }
      }
      return this.sortCandidates(candidates);
    }
    sortCandidates(candidates) {
      return [...candidates].sort((a, b) => {
        const throttledA = this.isThrottled(a[0].id) ? 1 : 0;
        const throttledB = this.isThrottled(b[0].id) ? 1 : 0;
        if (throttledA !== throttledB) return throttledA - throttledB;
        const tierA = a[0].tier.auth_type === "none" ? 1 : 0;
        const tierB = b[0].tier.auth_type === "none" ? 1 : 0;
        return tierA - tierB;
      });
    }
    async executeChatCompletion(request, options = {}) {
      if (options.proxyUrl) {
        const url = `${options.proxyUrl.replace(/\/+$/, "")}/chat/completions`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(options.timeoutMs || 45e3)
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Proxy error (${res.status}): ${txt}`);
        }
        return await res.json();
      }
      const candidates = this.resolveCandidates(request.model);
      if (candidates.length === 0) {
        const configured = this.getConfiguredProviders().map((p) => p.name);
        throw new Error(
          `No configured free provider found for model '${request.model}'. Configured in browser: ${configured.join(", ") || "None"}. Add API keys or use Pollinations (zero-auth).`
        );
      }
      let lastError = null;
      for (const [provider, modelId] of candidates) {
        if (this.isThrottled(provider.id)) continue;
        const allKeys = this.getProviderKeys(provider);
        const keysToAttempt = allKeys.length === 0 ? [null] : !this.enableKeyRotation ? [allKeys[0]] : allKeys.filter((k) => !this.isKeyThrottled(provider.id, k));
        if (keysToAttempt.length === 0) {
          this.markThrottled(provider.id, 60);
          if (!this.enableProviderRotation) break;
          continue;
        }
        let succeeded = false;
        for (const key of keysToAttempt) {
          const url = `${provider.api.base_url.replace(/\/+$/, "")}/chat/completions`;
          const headers = {
            "Content-Type": "application/json",
            ...provider.api.default_headers
          };
          if (key) headers["Authorization"] = `Bearer ${key}`;
          const payload = { ...request, model: modelId, stream: false };
          try {
            const resp = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(options.timeoutMs || 45e3)
            });
            if (resp.status === 429) {
              let bodyData = null;
              try {
                bodyData = await resp.json();
              } catch {
              }
              const resetWindow = extractResetWindow(resp.headers, bodyData, this.defaultCooldown);
              if (this.enableKeyRotation && key) {
                this.markKeyThrottled(provider.id, key, resetWindow);
                continue;
              } else {
                this.markThrottled(provider.id, resetWindow);
                break;
              }
            }
            if (resp.status === 401 || resp.status === 403) {
              if (this.enableKeyRotation && key) {
                this.markKeyThrottled(provider.id, key, 86400);
                continue;
              } else {
                break;
              }
            }
            if (resp.status >= 500) {
              this.markThrottled(provider.id, 30);
              break;
            }
            if (!resp.ok) {
              throw new Error(`HTTP ${resp.status} from ${provider.id}`);
            }
            const data = await resp.json();
            const meta = {
              provider_id: provider.id,
              provider_name: provider.name,
              model_served: modelId,
              base_url: provider.api.base_url,
              key_used: key ? `...${key.slice(-4)}` : null
            };
            data._zerogateway_meta = meta;
            data._free_llm_meta = meta;
            data.provider_id = provider.id;
            data.provider_name = provider.name;
            succeeded = true;
            return data;
          } catch (err) {
            lastError = err;
            break;
          }
        }
        if (succeeded) break;
        if (!this.enableProviderRotation) break;
      }
      throw new Error(`All candidate providers failed for '${request.model}'. Last error: ${lastError}`);
    }
    async *streamChatCompletion(request, options = {}) {
      if (options.proxyUrl) {
        const url = `${options.proxyUrl.replace(/\/+$/, "")}/chat/completions`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, stream: true }),
          signal: AbortSignal.timeout(options.timeoutMs || 6e4)
        });
        if (!res.ok || !res.body) {
          throw new Error(`Proxy streaming error: ${res.statusText}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) yield `${trimmed}

`;
          }
        }
        if (buffer.trim()) yield `${buffer.trim()}

`;
        return;
      }
      const candidates = this.resolveCandidates(request.model);
      if (candidates.length === 0) {
        throw new Error(`No free provider available for model '${request.model}'.`);
      }
      let lastError = null;
      for (const [provider, modelId] of candidates) {
        if (this.isThrottled(provider.id)) continue;
        const allKeys = this.getProviderKeys(provider);
        const keysToAttempt = allKeys.length === 0 ? [null] : !this.enableKeyRotation ? [allKeys[0]] : allKeys.filter((k) => !this.isKeyThrottled(provider.id, k));
        for (const key of keysToAttempt) {
          const url = `${provider.api.base_url.replace(/\/+$/, "")}/chat/completions`;
          const headers = {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...provider.api.default_headers
          };
          if (key) headers["Authorization"] = `Bearer ${key}`;
          const payload = { ...request, model: modelId, stream: true };
          try {
            const resp = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(options.timeoutMs || 6e4)
            });
            if (resp.status === 429) {
              let bodyData = null;
              try {
                bodyData = await resp.json();
              } catch {
              }
              const resetWindow = extractResetWindow(resp.headers, bodyData, this.defaultCooldown);
              if (this.enableKeyRotation && key) {
                this.markKeyThrottled(provider.id, key, resetWindow);
                continue;
              } else {
                this.markThrottled(provider.id, resetWindow);
                break;
              }
            }
            if (resp.status >= 400) {
              this.markThrottled(provider.id, 30);
              break;
            }
            if (!resp.body) throw new Error(`Empty stream body`);
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) yield `${trimmed}

`;
              }
            }
            if (buffer.trim()) yield `${buffer.trim()}

`;
            return;
          } catch (err) {
            lastError = err;
            continue;
          }
        }
        if (!this.enableProviderRotation) break;
      }
      throw new Error(`All providers failed for stream: ${lastError}`);
    }
  };
  var BrowserZeroGatewayClient = class {
    router;
    chat;
    constructor(options = {}) {
      this.router = new BrowserZeroGatewayRouter(options);
      this.chat = {
        completions: {
          create: async (params, opts) => {
            if (params.stream) {
              return this.router.streamChatCompletion(params, opts);
            }
            return this.router.executeChatCompletion(params, opts);
          }
        }
      };
    }
    listModels() {
      return this.router.registry.getAllModels();
    }
    listActiveProviders() {
      return this.router.getConfiguredProviders().map((p) => p.name);
    }
  };
  var ZeroGatewayClient = BrowserZeroGatewayClient;
  var ZeroGatewayRouter = BrowserZeroGatewayRouter;
  var RegistryManager = BrowserRegistryManager;
  return __toCommonJS(browser_exports);
})();
//# sourceMappingURL=zerogateway.browser.global.js.map