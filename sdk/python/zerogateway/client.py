from typing import List, Dict, Any, Optional, Union
from .models import ChatCompletionRequest, ChatMessage
from .router import ZeroGatewayRouter

class ChatCompletions:
    def __init__(self, router: ZeroGatewayRouter):
        self.router = router

    def create(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        temperature: Optional[float] = 0.7,
        max_tokens: Optional[int] = None,
        stream: Optional[bool] = False,
        **kwargs
    ) -> Any:
        formatted_messages = [
            ChatMessage(role=m["role"], content=m["content"], name=m.get("name"))
            for m in messages
        ]

        req = ChatCompletionRequest(
            model=model,
            messages=formatted_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream,
            **kwargs
        )

        if stream:
            return self.router.stream_chat_completion(req)

        data = self.router.execute_chat_completion(req)
        return ChatCompletionResponse(data)

class Chat:
    def __init__(self, router: ZeroGatewayRouter):
        self.completions = ChatCompletions(router)

class ChatCompletionResponse:
    def __init__(self, raw: Dict[str, Any]):
        self._raw = raw
        self.id = raw.get("id")
        self.model = raw.get("model")
        meta = raw.get("_zerogateway_meta") or raw.get("_free_llm_meta") or {}
        self.provider_id = meta.get("provider_id")
        self.provider_name = meta.get("provider_name")
        self.choices = [
            Choice(c) for c in raw.get("choices", [])
        ]
        self.usage = raw.get("usage", {})

    def to_dict(self) -> Dict[str, Any]:
        return self._raw

    def __repr__(self) -> str:
        content = self.choices[0].message.content[:50] if self.choices else ""
        return f"<ChatCompletionResponse provider='{self.provider_id}' model='{self.model}' content='{content}...'>"

class Choice:
    def __init__(self, choice_data: Dict[str, Any]):
        self.index = choice_data.get("index", 0)
        self.finish_reason = choice_data.get("finish_reason")
        msg = choice_data.get("message", {})
        self.message = Message(
            role=msg.get("role", "assistant"),
            content=msg.get("content", "")
        )

class Message:
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content

class ZeroGatewayClient:
    """
    OpenAI-compatible client for querying free LLM providers via Zerogateway.
    """

    def __init__(
        self,
        registry_url: Optional[str] = None,
        enable_key_rotation: Optional[bool] = None,
        enable_provider_rotation: Optional[bool] = None,
        api_keys: Optional[Dict[str, List[str]]] = None,
    ):
        self.router = ZeroGatewayRouter(
            enable_key_rotation=enable_key_rotation,
            enable_provider_rotation=enable_provider_rotation,
            api_keys=api_keys,
        )
        self.chat = Chat(self.router)

    def list_models(self) -> List[Dict[str, Any]]:
        return self.router.registry.get_all_models()

    def list_active_providers(self) -> List[str]:
        return [p.name for p in self.router.get_configured_providers()]

FreeLLMClient = ZeroGatewayClient

