import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from zerogateway.proxy.server import app

client = TestClient(app)

def test_proxy_status():
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "configured_providers_count" in data
    assert "stats" in data

def test_proxy_v1_models():
    response = client.get("/v1/models")
    assert response.status_code == 200
    data = response.json()
    assert data["object"] == "list"
    ids = [m["id"] for m in data["data"]]
    assert "auto" in ids
    assert "llama-3.3-70b" in ids

def test_proxy_chat_completions():
    mock_response = {
        "id": "chatcmpl-mock",
        "object": "chat.completion",
        "created": 1234567,
        "model": "llama-3.3-70b-versatile",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": "Proxy routing response"},
            "finish_reason": "stop"
        }],
        "_zerogateway_meta": {
            "provider_id": "groq",
            "provider_name": "GroqCloud"
        }
    }

    with patch("zerogateway.proxy.server.router_instance.execute_chat_completion", return_value=mock_response):
        payload = {
            "model": "llama-3.3-70b",
            "messages": [{"role": "user", "content": "Hello via proxy!"}]
        }
        res = client.post("/v1/chat/completions", json=payload)
        assert res.status_code == 200
        res_json = res.json()
        assert res_json["choices"][0]["message"]["content"] == "Proxy routing response"
