export interface PromoDetails {
  expires_at?: string | null;
  initial_credits_usd?: number;
  promo_code?: string | null;
  notes?: string;
}

export interface TierConfig {
  type: string;
  requires_credit_card: boolean;
  auth_type: string;
  signup_methods: string[];
  promo_details?: PromoDetails | null;
}

export interface ApiConfig {
  format: string;
  base_url: string;
  env_var?: string | null;
  default_headers: Record<string, string>;
}

export interface LimitsConfig {
  requests_per_minute?: number | null;
  requests_per_day?: number | null;
  tokens_per_minute?: number | null;
  tokens_per_day?: number | null;
  concurrency?: number | null;
}

export interface ModelSpec {
  id: string;
  display_name?: string | null;
  aliases: string[];
  context_window?: number | null;
  supports_tools: boolean;
  supports_vision: boolean;
  supports_streaming: boolean;
}

export interface ProviderSpec {
  id: string;
  name: string;
  website: string;
  console_url?: string | null;
  status: string;
  tier: TierConfig;
  api: ApiConfig;
  limits?: LimitsConfig | null;
  models: ModelSpec[];
}

export interface RegistryData {
  version: string;
  generated_at: string;
  stats: Record<string, any>;
  alias_routing_table: Record<string, Array<{
    provider_id: string;
    model_id: string;
    limits?: LimitsConfig;
  }>>;
  providers: ProviderSpec[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | string;
  content: string | any[];
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
  [key: string]: any;
}

export interface Message {
  role: string;
  content: string;
}

export interface Choice {
  index: number;
  finish_reason?: string | null;
  message: Message;
}

export interface ZeroGatewayMeta {
  provider_id: string;
  provider_name: string;
  model_served: string;
  base_url: string;
  key_used?: string | null;
}

export interface ChatCompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: Choice[];
  usage?: Record<string, any>;
  provider_id?: string;
  provider_name?: string;
  _zerogateway_meta?: ZeroGatewayMeta;
  _free_llm_meta?: ZeroGatewayMeta;
}
