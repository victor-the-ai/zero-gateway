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

def test_key_swapping_disabled_by_default():
    # Router default must have enable_key_rotation=False
    router = ZeroGatewayRouter()
    assert router.enable_key_rotation is False
    assert router.enable_provider_rotation is True

    mock_p1 = router.registry.get_provider("google_ai_studio")
    assert mock_p1 is not None

    # Configure multiple keys
    router.custom_api_keys["google_ai_studio"] = ["key_A", "key_B"]

    with patch.object(router, "resolve_candidates", return_value=[(mock_p1, "gemini-2.0-flash")]):
        mock_client = MagicMock()
        resp_429 = MagicMock()
        resp_429.status_code = 429
        resp_429.headers = {"retry-after": "60"}
        resp_429.text = "Rate limit reached"
        mock_client.post.return_value = resp_429

        req = ChatCompletionRequest(
            model="gemini-2.0-flash",
            messages=[ChatMessage(role="user", content="Hello")]
        )

        with pytest.raises(RuntimeError, match="All candidate free providers/keys failed"):
            router.execute_chat_completion(req, client=mock_client)

        # Because key rotation is disabled by default, only 1 request was attempted with key_A
        assert mock_client.post.call_count == 1
        call_headers = mock_client.post.call_args_list[0][1]["headers"]
        assert call_headers["Authorization"] == "Bearer key_A"

def test_key_swapping_with_reset_window():
    # Opt-in to key rotation
    router = ZeroGatewayRouter(enable_key_rotation=True)
    assert router.enable_key_rotation is True

    mock_p1 = router.registry.get_provider("google_ai_studio")
    assert mock_p1 is not None

    router.custom_api_keys["google_ai_studio"] = ["key_A", "key_B"]

    with patch.object(router, "resolve_candidates", return_value=[(mock_p1, "gemini-2.0-flash")]):
        mock_client = MagicMock()

        # Key A hits 429 with Retry-After 45s
        resp_429 = MagicMock()
        resp_429.status_code = 429
        resp_429.headers = {"retry-after": "45"}
        resp_429.json.return_value = {
            "error": {
                "message": "Resource exhausted",
                "details": [{"retryDelay": "45s"}]
            }
        }

        # Key B succeeds 200
        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.json.return_value = {
            "id": "chatcmpl-gemini",
            "choices": [{"message": {"role": "assistant", "content": "Hello from Google AI with key B!"}}]
        }
        resp_200.raise_for_status.return_value = None

        mock_client.post.side_effect = [resp_429, resp_200]

        req = ChatCompletionRequest(
            model="gemini-2.0-flash",
            messages=[ChatMessage(role="user", content="Hello")]
        )

        result = router.execute_chat_completion(req, client=mock_client)

        # Verified key swap happened
        assert result["choices"][0]["message"]["content"] == "Hello from Google AI with key B!"
        assert mock_client.post.call_count == 2

        # First call used key_A
        headers_call_1 = mock_client.post.call_args_list[0][1]["headers"]
        assert headers_call_1["Authorization"] == "Bearer key_A"

        # Second call used key_B
        headers_call_2 = mock_client.post.call_args_list[1][1]["headers"]
        assert headers_call_2["Authorization"] == "Bearer key_B"

        # Key A was marked throttled and noted the reset window of 45s
        assert router._is_key_throttled("google_ai_studio", "key_A") is True
        assert router.get_key_reset_window("google_ai_studio", "key_A") > 0.0
        # Key B is not throttled
        assert router._is_key_throttled("google_ai_studio", "key_B") is False

def test_key_swapping_on_expired_key_401():
    router = ZeroGatewayRouter(enable_key_rotation=True)
    mock_p1 = router.registry.get_provider("google_ai_studio")

    router.custom_api_keys["google_ai_studio"] = ["expired_key", "valid_key"]

    with patch.object(router, "resolve_candidates", return_value=[(mock_p1, "gemini-2.0-flash")]):
        mock_client = MagicMock()

        resp_401 = MagicMock()
        resp_401.status_code = 401
        resp_401.headers = {}
        resp_401.json.return_value = {"error": {"message": "API key expired"}}

        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.json.return_value = {
            "id": "chatcmpl-valid",
            "choices": [{"message": {"role": "assistant", "content": "Valid response"}}]
        }
        resp_200.raise_for_status.return_value = None

        mock_client.post.side_effect = [resp_401, resp_200]

        req = ChatCompletionRequest(
            model="gemini-2.0-flash",
            messages=[ChatMessage(role="user", content="Hello")]
        )

        result = router.execute_chat_completion(req, client=mock_client)
        assert result["choices"][0]["message"]["content"] == "Valid response"
        assert router._is_key_throttled("google_ai_studio", "expired_key") is True
        assert router._is_key_throttled("google_ai_studio", "valid_key") is False

def test_provider_rotation_disabled_option():
    # When enable_provider_rotation=False, cascading across providers is skipped
    router = ZeroGatewayRouter(enable_provider_rotation=False)
    assert router.enable_provider_rotation is False

    mock_p1 = router.registry.get_provider("groq")
    mock_p2 = router.registry.get_provider("cerebras")

    with patch.object(router, "resolve_candidates", return_value=[(mock_p1, "llama-3.3-70b-versatile"), (mock_p2, "llama3.3-70b")]):
        with patch.object(router, "get_provider_key", return_value="fake-key"):
            mock_client = MagicMock()
            resp_429 = MagicMock()
            resp_429.status_code = 429
            resp_429.headers = {}
            mock_client.post.return_value = resp_429

            req = ChatCompletionRequest(
                model="llama-3.3-70b",
                messages=[ChatMessage(role="user", content="Hi")]
            )

            with pytest.raises(RuntimeError, match="All candidate free providers/keys failed"):
                router.execute_chat_completion(req, client=mock_client)

            # Only 1 provider was attempted because provider rotation was turned off
            assert mock_client.post.call_count == 1

