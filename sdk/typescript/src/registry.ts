import fs from "fs";
import path from "path";
import os from "os";
import { RegistryData, ProviderSpec, LimitsConfig } from "./models.js";
import defaultRegistry from "../data/index.json" with { type: "json" };

export const DEFAULT_REGISTRY_URL = "https://raw.githubusercontent.com/victor-the-ai/zero-gateway/main/registry/index.json";

function getCacheDir(): string {
  if (typeof process === "undefined" || !process.env) {
    return "/tmp/.cache/zerogateway";
  }
  const custom = process.env.ZERO_GATEWAY_CACHE_DIR || process.env.FREE_LLM_CACHE_DIR;
  if (custom) {
    return custom.startsWith("~") ? path.join(os.homedir(), custom.slice(1)) : custom;
  }
  return path.join(os.homedir(), ".cache", "zerogateway");
}

const CACHE_DIR = getCacheDir();
const CACHE_FILE = path.join(CACHE_DIR, "registry_index.json");
const CACHE_TTL_SECONDS = 86400; // 24 hours

export class RegistryManager {
  public registryUrl: string;
  public autoSync: boolean;
  private _data?: RegistryData;

  constructor(registryUrl?: string, autoSync: boolean = true) {
    const envUrl = typeof process !== "undefined" && process.env ? (process.env.ZERO_GATEWAY_REGISTRY_URL || process.env.FREE_LLM_REGISTRY_URL) : undefined;
    this.registryUrl = registryUrl || envUrl || DEFAULT_REGISTRY_URL;
    this.autoSync = autoSync;
    this.load();
  }

  get data(): RegistryData {
    if (!this._data) {
      this.load();
    }
    return this._data!;
  }

  public isCacheStale(): boolean {
    if (typeof window !== "undefined") {
      return false;
    }
    if (!fs.existsSync(CACHE_FILE)) {
      return true;
    }
    try {
      const stats = fs.statSync(CACHE_FILE);
      const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
      return ageSeconds > CACHE_TTL_SECONDS;
    } catch {
      return true;
    }
  }


  public load(forceRemote: boolean = false): RegistryData {
    if (forceRemote || (this.autoSync && this.isCacheStale())) {
      // Attempt background/synchronous-equivalent sync, or ignore error
      try {
        this.syncSync();
      } catch {
        // Fall back gracefully to cache or bundled
      }
    }

    // 0. Browser environment
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("zerogateway_registry");
        if (cached) {
          this._data = JSON.parse(cached) as RegistryData;
          return this._data;
        }
      } catch {}
      this._data = defaultRegistry as unknown as RegistryData;
      return this._data;
    }

    // 1. Try cache file
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const raw = fs.readFileSync(CACHE_FILE, "utf-8");
        this._data = JSON.parse(raw) as RegistryData;
        return this._data;
      } catch {
        // Continue to fallback
      }
    }

    // 2. Try bundled package data/index.json
    const searchDirs = [
      path.resolve(__dirname, "data", "index.json"),
      path.resolve(__dirname, "..", "data", "index.json"),
      path.resolve(__dirname, "..", "..", "data", "index.json"),
      path.resolve(__dirname, "..", "..", "..", "registry", "index.json"),
      path.resolve(__dirname, "..", "..", "..", "..", "registry", "index.json"),
      path.resolve(process.cwd(), "registry", "index.json"),
      path.resolve(process.cwd(), "data", "index.json"),
    ];

    for (const p of searchDirs) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, "utf-8");
          this._data = JSON.parse(raw) as RegistryData;
          return this._data;
        } catch {
          // continue
        }
      }
    }

    // 3. Fallback to embedded defaultRegistry
    this._data = defaultRegistry as unknown as RegistryData;
    return this._data;
  }

  private syncSync(): void {
    // Synchronous sync stub
  }

  public async sync(): Promise<void> {
    const res = await fetch(this.registryUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(`Failed to fetch registry from ${this.registryUrl}: HTTP ${res.status}`);
    }
    const data = await res.json() as RegistryData;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("zerogateway_registry", JSON.stringify(data));
      } catch {}
      this._data = data;
      return;
    }

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
    this._data = data;
  }


  public getProvider(providerId: string): ProviderSpec | undefined {
    return this.data.providers.find((p) => p.id === providerId);
  }

  public getProvidersForAlias(alias: string): Array<{ provider_id: string; model_id: string; limits?: LimitsConfig }> {
    return this.data.alias_routing_table[alias] || [];
  }

  public getAllModels(): Array<{
    id: string;
    display_name?: string | null;
    aliases: string[];
    context_window?: number | null;
    provider_id: string;
    provider_name: string;
    tier_type: string;
    auth_type: string;
    limits?: LimitsConfig | null;
  }> {
    const models: any[] = [];
    for (const p of this.data.providers) {
      for (const m of p.models) {
        models.push({
          id: m.id,
          display_name: m.display_name,
          aliases: m.aliases,
          context_window: m.context_window,
          provider_id: p.id,
          provider_name: p.name,
          tier_type: p.tier.type,
          auth_type: p.tier.auth_type,
          limits: p.limits,
        });
      }
    }
    return models;
  }
}
