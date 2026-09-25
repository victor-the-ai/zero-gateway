from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

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
    default_headers: Dict[str, str] = Field(default_factory=dict)

class LimitsConfig(BaseModel):
    requests_per_minute: Optional[int] = None
    requests_per_day: Optional[int] = None
    tokens_per_minute: Optional[int] = None
    tokens_per_day: Optional[int] = None
    concurrency: Optional[int] = None

class ModelSpec(BaseModel):
    id: str
    display_name: Optional[str] = None
    aliases: List[str] = Field(default_factory=list)
    context_window: Optional[int] = None
    supports_tools: bool = False
    supports_vision: bool = False
    supports_streaming: bool = True

class ProviderSpec(BaseModel):
    id: str
    name: str
    website: str
    console_url: Optional[str] = None
    status: str = "active"
    tier: TierConfig
    api: ApiConfig
    limits: Optional[LimitsConfig] = None
    models: List[ModelSpec]

class RegistryData(BaseModel):
    version: str
    generated_at: str
    stats: Dict[str, Any]
    alias_routing_table: Dict[str, List[Dict[str, Any]]]
    providers: List[ProviderSpec]

# OpenAI API Compatibility models
class ChatMessage(BaseModel):
    role: str
    content: Union[str, List[Dict[str, Any]]]
    name: Optional[str] = None

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 1.0
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False
    stop: Optional[Union[str, List[str]]] = None
    presence_penalty: Optional[float] = 0.0
    frequency_penalty: Optional[float] = 0.0
    user: Optional[str] = None
