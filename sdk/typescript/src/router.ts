import dotenv from "dotenv";
import { ProviderSpec, ChatCompletionRequest, ChatCompletionResponse, ZeroGatewayMeta } from "./models.js";
import { RegistryManager } from "./registry.js";
import { extractResetWindow } from "./utils.js";

dotenv.config();

export { extractResetWindow };

export interface RouterOptions {
  registry?: RegistryManager;
  enableKeyRotation?: boolean;
  enableProviderRotation?: boolean;
  apiKeys?: Record<string, string[]>;
  defaultCooldown?: number;
}


export class ZeroGatewayRouter {
  public registry: RegistryManager;
  public enableKeyRotation: boolean;
  public enableProviderRotation: boolean;
  public customApiKeys: Record<string, string[]>;
  public defaultCooldown: number;

  public throttledUntil: Map<string, number> = new Map(); // provider_id -> ms timestamp
  public keyThrottledUntil: Map<string, number> = new Map(); // `${provider_id}:${key}` -> ms timestamp
  public stats: Map<string, { success: number; throttled: number; failed: number }> = new Map();
  public keyStats: Map<string, Map<string, { success: number; throttled: number; failed: number }>> = new Map();

  constructor(options: RouterOptions = {}) {
    this.registry = options.registry || new RegistryManager();
    this.customApiKeys = options.apiKeys || {};
    this.defaultCooldown = options.defaultCooldown ?? 60.0;

    // Configurable options, key rotation is NOT enabled by default
    if (options.enableKeyRotation !== undefined) {
      this.enableKeyRotation = options.enableKeyRotation;
    } else {
      const env = (process.env.ENABLE_KEY_ROTATION || "false").toLowerCase();
      this.enableKeyRotation = env === "true" || env === "1" || env === "yes";
    }

    if (options.enableProviderRotation !== undefined) {
      this.enableProviderRotation = options.enableProviderRotation;
    } else {
      const env = (process.env.ENABLE_PROVIDER_ROTATION || "true").toLowerCase();
      this.enableProviderRotation = env === "true" || env === "1" || env === "yes";
    }
  }

  public getProviderKeys(provider: ProviderSpec): string[] {
    if (this.customApiKeys[provider.id]) {
      return [...this.customApiKeys[provider.id]];
    }
    if (provider.api.env_var && this.customApiKeys[provider.api.env_var]) {
      return [...this.customApiKeys[provider.api.env_var]];
    }

    const keys: string[] = [];
    if (!provider.api.env_var) {
      return keys;
    }

    const envVar = provider.api.env_var;

    // 1. Standard env var (supports comma or newline separation)
    const raw = process.env[envVar] || "";
    if (raw.trim()) {
      for (const k of raw.replace(/\n/g, ",").split(",")) {
        const clean = k.trim();
        if (clean && !keys.includes(clean)) {
          keys.push(clean);
        }
      }
    }

    // 2. Plural form (e.g. GEMINI_API_KEYS)
    const pluralVar = envVar.endsWith("S") ? envVar : `${envVar}S`;
    const rawPlural = process.env[pluralVar] || "";
    if (rawPlural.trim()) {
      for (const k of rawPlural.replace(/\n/g, ",").split(",")) {
        const clean = k.trim();
        if (clean && !keys.includes(clean)) {
          keys.push(clean);
        }
      }
    }

    // 3. Indexed form (e.g. GEMINI_API_KEY_1, GEMINI_API_KEY_2)
    let idx = 1;
    while (true) {
      const indexedVal = process.env[`${envVar}_${idx}`];
      if (!indexedVal) break;
      const clean = indexedVal.trim();
      if (clean && !keys.includes(clean)) {
        keys.push(clean);
      }
      idx++;
    }

    const singleKey = this.getProviderKey(provider);
    if (singleKey && !keys.includes(singleKey)) {
      keys.push(singleKey);
    }

    return keys;
  }

  public isProviderConfigured(provider: ProviderSpec): boolean {
    if (provider.tier.auth_type === "none" || !provider.api.env_var) {
      return true;
    }
    return this.getProviderKeys(provider).length > 0;
  }

  public getProviderKey(provider: ProviderSpec): string | undefined {
    if (!provider.api.env_var) return undefined;
    return process.env[provider.api.env_var]?.trim() || undefined;
  }

  public getConfiguredProviders(): ProviderSpec[] {
    return this.registry.data.providers.filter(
      (p) => p.status === "active" && this.isProviderConfigured(p)
    );
  }

  public isThrottled(providerId: string): boolean {
    const cooldownUntil = this.throttledUntil.get(providerId) || 0;
    return Date.now() < cooldownUntil;
  }

  public isKeyThrottled(providerId: string, key: string): boolean {
    const cooldownUntil = this.keyThrottledUntil.get(`${providerId}:${key}`) || 0;
    return Date.now() < cooldownUntil;
  }

  public getKeyResetWindow(providerId: string, key: string): number {
    const cooldownUntil = this.keyThrottledUntil.get(`${providerId}:${key}`) || 0;
    return Math.max(0, (cooldownUntil - Date.now()) / 1000);
  }

  public markThrottled(providerId: string, cooldownSeconds: number = 60.0): void {
    this.throttledUntil.set(providerId, Date.now() + cooldownSeconds * 1000);
    this.recordStat(providerId, "throttled");
  }

  public markKeyThrottled(providerId: string, key: string, cooldownSeconds: number = 60.0): void {
    const resetTime = Date.now() + cooldownSeconds * 1000;
    this.keyThrottledUntil.set(`${providerId}:${key}`, resetTime);
    this.recordKeyStat(providerId, key, "throttled");
  }

  private recordStat(providerId: string, eventType: "success" | "throttled" | "failed"): void {
    if (!this.stats.has(providerId)) {
      this.stats.set(providerId, { success: 0, throttled: 0, failed: 0 });
    }
    const current = this.stats.get(providerId)!;
    current[eventType]++;
  }

  private recordKeyStat(providerId: string, key: string, eventType: "success" | "throttled" | "failed"): void {
    const preview = key.length > 4 ? `...${key.slice(-4)}` : key;
    if (!this.keyStats.has(providerId)) {
      this.keyStats.set(providerId, new Map());
    }
    const pMap = this.keyStats.get(providerId)!;
    if (!pMap.has(preview)) {
      pMap.set(preview, { success: 0, throttled: 0, failed: 0 });
    }
    const current = pMap.get(preview)!;
    current[eventType]++;
  }

  public resolveCandidates(requestedModel: string): Array<[ProviderSpec, string]> {
    const candidates: Array<[ProviderSpec, string]> = [];
    const modelReq = requestedModel.trim();

    // 1. auto / default alias
    if (modelReq === "auto" || modelReq === "default") {
      for (const p of this.getConfiguredProviders()) {
        if (p.models && p.models.length > 0) {
          candidates.push([p, p.models[0].id]);
        }
      }
      return this.sortCandidates(candidates);
    }

    // 2. Alias table lookup
    const matches = this.registry.getProvidersForAlias(modelReq);
    for (const m of matches) {
      const p = this.registry.getProvider(m.provider_id);
      if (p && this.isProviderConfigured(p)) {
        candidates.push([p, m.model_id]);
      }
    }

    // 3. Direct model match
    if (candidates.length === 0) {
      for (const p of this.getConfiguredProviders()) {
        for (const m of p.models) {
          if (m.id.toLowerCase() === modelReq.toLowerCase()) {
            candidates.push([p, m.id]);
          }
        }
      }
    }

    // 4. Substring family match (e.g. 'llama-3.3' or 'deepseek')
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
      if (throttledA !== throttledB) {
        return throttledA - throttledB;
      }
      const tierA = a[0].tier.auth_type === "none" ? 1 : 0;
      const tierB = b[0].tier.auth_type === "none" ? 1 : 0;
      return tierA - tierB;
    });
  }

  public async executeChatCompletion(
    request: ChatCompletionRequest,
    options: { timeoutMs?: number; fetchFn?: typeof fetch } = {}
  ): Promise<ChatCompletionResponse> {
    const candidates = this.resolveCandidates(request.model);
    if (candidates.length === 0) {
      const configured = this.getConfiguredProviders().map((p) => p.name);
      throw new Error(
        `No configured free provider found for model '${request.model}'. ` +
        `Configured providers in environment: ${configured.length ? configured.join(", ") : "None"}. ` +
        `Check your .env keys or use model='auto'.`
      );
    }

    const fetchImpl = options.fetchFn || fetch;
    const timeoutMs = options.timeoutMs || 45000;
    let lastError: any = null;

    for (const [provider, modelId] of candidates) {
      if (this.isThrottled(provider.id)) {
        continue;
      }

      const allKeys = this.getProviderKeys(provider);
      let keysToAttempt: Array<string | null>;

      if (allKeys.length === 0) {
        keysToAttempt = [null];
      } else if (!this.enableKeyRotation) {
        // Key swapping disabled (default): only attempt primary key
        keysToAttempt = [allKeys[0]];
      } else {
        // Key swapping enabled: pick available unthrottled keys
        keysToAttempt = allKeys.filter((k) => !this.isKeyThrottled(provider.id, k));
        if (keysToAttempt.length === 0) {
          // All keys for this provider are throttled; note shortest reset window
          const minReset = Math.min(...allKeys.map((k) => this.keyThrottledUntil.get(`${provider.id}:${k}`) || 0));
          const remaining = Math.max(1.0, (minReset - Date.now()) / 1000);
          this.throttledUntil.set(provider.id, Date.now() + remaining * 1000);
          if (!this.enableProviderRotation) {
            break;
          }
          continue;
        }
      }

      let providerSucceeded = false;
      for (const key of keysToAttempt) {
        const url = `${provider.api.base_url.replace(/\/+$/, "")}/chat/completions`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...provider.api.default_headers,
        };

        if (key) {
          headers["Authorization"] = `Bearer ${key}`;
        }

        const payload: Record<string, any> = {
          ...request,
          model: modelId,
          stream: false,
        };

        const keyPreview = key ? (key.length > 4 ? `...${key.slice(-4)}` : key) : "none";

        try {
          const resp = await fetchImpl(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(timeoutMs),
          });

          if (resp.status === 429) {
            let bodyData: any = null;
            try { bodyData = await resp.json(); } catch {}
            const resetWindow = extractResetWindow(resp.headers, bodyData, this.defaultCooldown);

            if (this.enableKeyRotation && key) {
              this.markKeyThrottled(provider.id, key, resetWindow);
              continue; // Auto swap to next key of same provider
            } else {
              this.markThrottled(provider.id, resetWindow);
              break; // Cascade to next provider
            }
          }

          if (resp.status === 401 || resp.status === 403) {
            let bodyData: any = null;
            try { bodyData = await resp.json(); } catch {}
            const resetWindow = extractResetWindow(resp.headers, bodyData, 86400.0);

            if (this.enableKeyRotation && key) {
              this.markKeyThrottled(provider.id, key, resetWindow);
              continue; // Auto swap to next key
            } else {
              this.recordStat(provider.id, "failed");
              break;
            }
          }

          if ([500, 502, 503, 504].includes(resp.status)) {
            this.markThrottled(provider.id, 30.0);
            break; // Server error: cascade
          }

          if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`HTTP ${resp.status} from ${provider.id}: ${errText.slice(0, 200)}`);
          }

          const data = await resp.json() as ChatCompletionResponse;
          const meta: ZeroGatewayMeta = {
            provider_id: provider.id,
            provider_name: provider.name,
            model_served: modelId,
            base_url: provider.api.base_url,
            key_used: key ? keyPreview : null,
          };

          data._zerogateway_meta = meta;
          data._free_llm_meta = meta;
          data.provider_id = provider.id;
          data.provider_name = provider.name;

          this.recordStat(provider.id, "success");
          if (key) {
            this.recordKeyStat(provider.id, key, "success");
          }
          providerSucceeded = true;
          return data;
        } catch (err: any) {
          lastError = err;
          this.recordStat(provider.id, "failed");
          if (key) {
            this.recordKeyStat(provider.id, key, "failed");
          }
          break;
        }
      }

      if (providerSucceeded) {
        break;
      }

      if (!this.enableProviderRotation) {
        break;
      }
    }

    throw new Error(`All candidate free providers/keys failed for '${request.model}'. Last error: ${lastError}`);
  }

  public async *streamChatCompletion(
    request: ChatCompletionRequest,
    options: { timeoutMs?: number; fetchFn?: typeof fetch } = {}
  ): AsyncGenerator<string, void, unknown> {
    const candidates = this.resolveCandidates(request.model);
    if (candidates.length === 0) {
      throw new Error(`No free provider available for model '${request.model}'.`);
    }

    const fetchImpl = options.fetchFn || fetch;
    const timeoutMs = options.timeoutMs || 60000;
    let lastError: any = null;

    for (const [provider, modelId] of candidates) {
      if (this.isThrottled(provider.id)) {
        continue;
      }

      const allKeys = this.getProviderKeys(provider);
      let keysToAttempt: Array<string | null>;

      if (allKeys.length === 0) {
        keysToAttempt = [null];
      } else if (!this.enableKeyRotation) {
        keysToAttempt = [allKeys[0]];
      } else {
        keysToAttempt = allKeys.filter((k) => !this.isKeyThrottled(provider.id, k));
        if (keysToAttempt.length === 0) {
          const minReset = Math.min(...allKeys.map((k) => this.keyThrottledUntil.get(`${provider.id}:${k}`) || 0));
          const remaining = Math.max(1.0, (minReset - Date.now()) / 1000);
          this.throttledUntil.set(provider.id, Date.now() + remaining * 1000);
          if (!this.enableProviderRotation) {
            break;
          }
          continue;
        }
      }

      for (const key of keysToAttempt) {
        const url = `${provider.api.base_url.replace(/\/+$/, "")}/chat/completions`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          ...provider.api.default_headers,
        };

        if (key) {
          headers["Authorization"] = `Bearer ${key}`;
        }

        const payload: Record<string, any> = {
          ...request,
          model: modelId,
          stream: true,
        };

        try {
          const resp = await fetchImpl(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(timeoutMs),
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
            let bodyData: any = null;
            try { bodyData = await resp.json(); } catch {}
            const resetWindow = extractResetWindow(resp.headers, bodyData, 86400.0);

            if (this.enableKeyRotation && key) {
              this.markKeyThrottled(provider.id, key, resetWindow);
              continue;
            } else {
              this.recordStat(provider.id, "failed");
              break;
            }
          }

          if (resp.status >= 400) {
            this.markThrottled(provider.id, 30.0);
            break;
          }

          if (!resp.body) {
            throw new Error(`Empty response stream from ${provider.id}`);
          }

          this.recordStat(provider.id, "success");
          if (key) {
            this.recordKeyStat(provider.id, key, "success");
          }

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
              if (trimmed) {
                yield `${trimmed}\n\n`;
              }
            }
          }

          if (buffer.trim()) {
            yield `${buffer.trim()}\n\n`;
          }

          return;
        } catch (err: any) {
          lastError = err;
          this.recordStat(provider.id, "failed");
          if (key) {
            this.recordKeyStat(provider.id, key, "failed");
          }
          continue;
        }
      }

      if (!this.enableProviderRotation) {
        break;
      }
    }

    throw new Error(`All free providers failed for stream: ${lastError}`);
  }
}

export const FreeLLMRouter = ZeroGatewayRouter;
