import defaultRegistry from "../data/index.json" with { type: "json" };
import {
  RegistryData,
  ProviderSpec,
  LimitsConfig,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ZeroGatewayMeta,
} from "./models.js";
import { extractResetWindow } from "./utils.js";

export * from "./models.js";
export { extractResetWindow };


export class BrowserRegistryManager {
  public registryUrl: string;
  public autoSync: boolean;
  private _data?: RegistryData;

  constructor(registryUrl?: string, autoSync: boolean = true) {
    this.registryUrl =
      registryUrl ||
      "https://raw.githubusercontent.com/victor-the-ai/zero-gateway/main/registry/index.json";
    this.autoSync = autoSync;
    this.load();
  }

  get data(): RegistryData {
    if (!this._data) this.load();
    return this._data!;
  }

  public load(): RegistryData {
    if (typeof localStorage !== "undefined") {
      try {
        const cached = localStorage.getItem("zerogateway_registry");
        if (cached) {
          this._data = JSON.parse(cached);
          return this._data!;
        }
      } catch {}
    }
    this._data = defaultRegistry as unknown as RegistryData;
    return this._data;
  }

  public async sync(): Promise<void> {
    try {
      const res = await fetch(this.registryUrl);
      if (res.ok) {
        const data = (await res.json()) as RegistryData;
        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem("zerogateway_registry", JSON.stringify(data));
          } catch {}
        }
        this._data = data;
      }
    } catch {}
  }

  public getProvider(id: string): ProviderSpec | undefined {
    return this.data.providers.find((p) => p.id === id);
  }

  public getProvidersForAlias(alias: string) {
    return this.data.alias_routing_table[alias] || [];
  }

  public getAllModels() {
    const models: any[] = [];
    for (const p of this.data.providers) {
      for (const m of p.models) {
        models.push({
          id: m.id,
          display_name: m.display_name,
          aliases: m.aliases,
          provider_id: p.id,
          provider_name: p.name,
        });
      }
    }
    return models;
  }
}

export interface BrowserRouterOptions {
  registry?: BrowserRegistryManager;
  enableKeyRotation?: boolean;
  enableProviderRotation?: boolean;
  apiKeys?: Record<string, string[]>;
  defaultCooldown?: number;
}

export class BrowserZeroGatewayRouter {
  public registry: BrowserRegistryManager;
  public enableKeyRotation: boolean;
  public enableProviderRotation: boolean;
  public customApiKeys: Record<string, string[]>;
  public defaultCooldown: number;

  public throttledUntil: Map<string, number> = new Map();
  public keyThrottledUntil: Map<string, number> = new Map();
  public stats: Map<string, { success: number; throttled: number; failed: number }> = new Map();

  constructor(options: BrowserRouterOptions = {}) {
    this.registry = options.registry || new BrowserRegistryManager();
    this.customApiKeys = options.apiKeys || {};
    this.defaultCooldown = options.defaultCooldown ?? 60.0;
    this.enableKeyRotation = options.enableKeyRotation ?? false;
    this.enableProviderRotation = options.enableProviderRotation ?? true;
  }

  public getProviderKeys(provider: ProviderSpec): string[] {
    const candidateKeys = [
      provider.id,
      provider.id.replace(/_/g, ""),
      provider.name.toLowerCase(),
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

  public isProviderConfigured(provider: ProviderSpec): boolean {
    if (provider.tier.auth_type === "none" || !provider.api.env_var) {
      return true;
    }
    return this.getProviderKeys(provider).length > 0;
  }

  public getConfiguredProviders(): ProviderSpec[] {
    return this.registry.data.providers.filter(
      (p) => p.status === "active" && this.isProviderConfigured(p)
    );
  }

  public isThrottled(providerId: string): boolean {
    return Date.now() < (this.throttledUntil.get(providerId) || 0);
  }

  public isKeyThrottled(providerId: string, key: string): boolean {
    return Date.now() < (this.keyThrottledUntil.get(`${providerId}:${key}`) || 0);
  }

  public markThrottled(providerId: string, cooldownSeconds = 60.0): void {
    this.throttledUntil.set(providerId, Date.now() + cooldownSeconds * 1000);
  }

  public markKeyThrottled(providerId: string, key: string, cooldownSeconds = 60.0): void {
    this.keyThrottledUntil.set(`${providerId}:${key}`, Date.now() + cooldownSeconds * 1000);
  }

  public resolveCandidates(requestedModel: string): Array<[ProviderSpec, string]> {
    const candidates: Array<[ProviderSpec, string]> = [];
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

  private sortCandidates(candidates: Array<[ProviderSpec, string]>): Array<[ProviderSpec, string]> {
    return [...candidates].sort((a, b) => {
      const throttledA = this.isThrottled(a[0].id) ? 1 : 0;
      const throttledB = this.isThrottled(b[0].id) ? 1 : 0;
      if (throttledA !== throttledB) return throttledA - throttledB;
      const tierA = a[0].tier.auth_type === "none" ? 1 : 0;
      const tierB = b[0].tier.auth_type === "none" ? 1 : 0;
      return tierA - tierB;
    });
  }

  public async executeChatCompletion(
    request: ChatCompletionRequest,
    options: { proxyUrl?: string; timeoutMs?: number } = {}
  ): Promise<ChatCompletionResponse> {
    // If proxyUrl is provided (e.g. http://localhost:8080/v1), route through the proxy!
    if (options.proxyUrl) {
      const url = `${options.proxyUrl.replace(/\/+$/, "")}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(options.timeoutMs || 45000),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Proxy error (${res.status}): ${txt}`);
      }
      return (await res.json()) as ChatCompletionResponse;
    }

    const candidates = this.resolveCandidates(request.model);
    if (candidates.length === 0) {
      const configured = this.getConfiguredProviders().map((p) => p.name);
      throw new Error(
        `No configured free provider found for model '${request.model}'. Configured in browser: ${configured.join(", ") || "None"}. Add API keys or use Pollinations (zero-auth).`
      );
    }

    let lastError: any = null;

    for (const [provider, modelId] of candidates) {
      if (this.isThrottled(provider.id)) continue;

      const allKeys = this.getProviderKeys(provider);
      const keysToAttempt = allKeys.length === 0
        ? [null]
        : !this.enableKeyRotation
        ? [allKeys[0]]
        : allKeys.filter((k) => !this.isKeyThrottled(provider.id, k));

      if (keysToAttempt.length === 0) {
        this.markThrottled(provider.id, 60);
        if (!this.enableProviderRotation) break;
        continue;
      }

      let succeeded = false;
      for (const key of keysToAttempt) {
        const url = `${provider.api.base_url.replace(/\/+$/, "")}/chat/completions`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...provider.api.default_headers,
        };
        if (key) headers["Authorization"] = `Bearer ${key}`;

        const payload = { ...request, model: modelId, stream: false };

        try {
          const resp = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(options.timeoutMs || 45000),
          });

          if (resp.status === 429) {
            let bodyData: any = null;
            try { bodyData = await resp.json(); } catch {}
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

          const data = (await resp.json()) as ChatCompletionResponse;
          const meta: ZeroGatewayMeta = {
            provider_id: provider.id,
            provider_name: provider.name,
            model_served: modelId,
            base_url: provider.api.base_url,
            key_used: key ? `...${key.slice(-4)}` : null,
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

  public async *streamChatCompletion(
    request: ChatCompletionRequest,
    options: { proxyUrl?: string; timeoutMs?: number } = {}
  ): AsyncGenerator<string, void, unknown> {
    if (options.proxyUrl) {
      const url = `${options.proxyUrl.replace(/\/+$/, "")}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, stream: true }),
        signal: AbortSignal.timeout(options.timeoutMs || 60000),
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
          if (trimmed) yield `${trimmed}\n\n`;
        }
      }
      if (buffer.trim()) yield `${buffer.trim()}\n\n`;
      return;
    }

    const candidates = this.resolveCandidates(request.model);
    if (candidates.length === 0) {
      throw new Error(`No free provider available for model '${request.model}'.`);
    }

    let lastError: any = null;

    for (const [provider, modelId] of candidates) {
      if (this.isThrottled(provider.id)) continue;

      const allKeys = this.getProviderKeys(provider);
      const keysToAttempt = allKeys.length === 0
        ? [null]
        : !this.enableKeyRotation
        ? [allKeys[0]]
        : allKeys.filter((k) => !this.isKeyThrottled(provider.id, k));

      for (const key of keysToAttempt) {
        const url = `${provider.api.base_url.replace(/\/+$/, "")}/chat/completions`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...provider.api.default_headers,
        };
        if (key) headers["Authorization"] = `Bearer ${key}`;

        const payload = { ...request, model: modelId, stream: true };

        try {
          const resp = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(options.timeoutMs || 60000),
          });

          if (resp.status === 429) {
            let bodyData: any = null;
            try { bodyData = await resp.json(); } catch {}
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
              if (trimmed) yield `${trimmed}\n\n`;
            }
          }
          if (buffer.trim()) yield `${buffer.trim()}\n\n`;
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
}

export class BrowserZeroGatewayClient {
  public router: BrowserZeroGatewayRouter;
  public chat: {
    completions: {
      create: (params: ChatCompletionRequest, options?: { proxyUrl?: string }) => Promise<ChatCompletionResponse | AsyncGenerator<string>>;
    };
  };

  constructor(options: BrowserRouterOptions = {}) {
    this.router = new BrowserZeroGatewayRouter(options);
    this.chat = {
      completions: {
        create: async (params: ChatCompletionRequest, opts?: { proxyUrl?: string }) => {
          if (params.stream) {
            return this.router.streamChatCompletion(params, opts);
          }
          return this.router.executeChatCompletion(params, opts);
        },
      },
    };
  }

  public listModels() {
    return this.router.registry.getAllModels();
  }

  public listActiveProviders(): string[] {
    return this.router.getConfiguredProviders().map((p) => p.name);
  }
}

export const ZeroGatewayClient = BrowserZeroGatewayClient;
export const ZeroGatewayRouter = BrowserZeroGatewayRouter;
export const RegistryManager = BrowserRegistryManager;
