import pytest
import httpx
from unittest.mock import MagicMock, patch
from zerogateway.router import ZeroGatewayRouter
from zerogateway.models import ChatCompletionRequest, ChatMessage, ProviderSpec

def test_resolve_candidates():
    router = ZeroGatewayRouter()
    # Mock configured keys for groq and cerebras
    with patch.object(router, "is_provider_configured", return_value=True):
        candidates = router.resolve_candidates("llama-3.3-70b")
        assert len(candidates) >= 2
        provider_ids = [c[0].id for c in candidates]
        assert "groq" in provider_ids or "cerebras" in provider_ids

def test_cascade_failover_on_429():
    router = ZeroGatewayRouter()
    
    # Fake two candidate providers
    mock_p1 = router.registry.get_provider("groq")
    mock_p2 = router.registry.get_provider("cerebras")
    assert mock_p1 is not None and mock_p2 is not None

    with patch.object(router, "resolve_candidates", return_value=[(mock_p1, "llama-3.3-70b-versatile"), (mock_p2, "llama3.3-70b")]):
        with patch.object(router, "get_provider_key", return_value="fake-key"):
            # Mock httpx client where first call returns 429 and second call returns 200
            mock_client = MagicMock()
            
            resp_429 = MagicMock()
            resp_429.status_code = 429
            resp_429.text = "Rate limit reached"

            resp_200 = MagicMock()
            resp_200.status_code = 200
            resp_200.json.return_value = {
                "id": "chatcmpl-test",
                "choices": [{"message": {"role": "assistant", "content": "Hello from Cerebras!"}}]
            }
            resp_200.raise_for_status.return_value = None

            mock_client.post.side_effect = [resp_429, resp_200]

            req = ChatCompletionRequest(
                model="llama-3.3-70b",
                messages=[ChatMessage(role="user", content="Hi")]
            )

            result = router.execute_chat_completion(req, client=mock_client)

            # Verification
            assert result["choices"][0]["message"]["content"] == "Hello from Cerebras!"
            assert result["_zerogateway_meta"]["provider_id"] == "cerebras"
            # Verify groq was marked throttled
            assert router._is_throttled("groq") is True
            assert router._is_throttled("cerebras") is False
            assert router.stats["groq"]["throttled"] == 1
            assert router.stats["cerebras"]["success"] == 1
