import time
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from ..models import ChatCompletionRequest
from ..router import ZeroGatewayRouter

app = FastAPI(
    title="Zerogateway Proxy",
    description="Drop-in OpenAI-compatible proxy with automatic fallback across free LLM providers",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router_instance = ZeroGatewayRouter()

@app.get("/")
def index():
    return {
        "service": "Zerogateway Proxy",
        "status": "online",
        "documentation": "/docs",
        "active_providers": [p.name for p in router_instance.get_configured_providers()]
    }

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time()}

@app.get("/status")
def status():
    configured = router_instance.get_configured_providers()
    return {
        "configured_providers_count": len(configured),
        "key_rotation_enabled": router_instance.enable_key_rotation,
        "provider_rotation_enabled": router_instance.enable_provider_rotation,
        "configured_providers": [
            {
                "id": p.id,
                "name": p.name,
                "tier": p.tier.type,
                "auth_type": p.tier.auth_type,
                "models_count": len(p.models),
                "keys_count": len(router_instance.get_provider_keys(p)),
                "is_throttled": router_instance._is_throttled(p.id)
            }
            for p in configured
        ],
        "stats": router_instance.stats,
        "key_stats": router_instance.key_stats,
        "active_cooldowns": {
            f"{p_id}:{k[-4:] if len(k) > 4 else k}": f"resets in {max(0, int(t - time.time()))}s"
            for (p_id, k), t in router_instance.key_throttled_until.items()
            if t > time.time()
        }
    }

@app.get("/v1/models")
def list_models():
    """
    OpenAI-compatible models list endpoint.
    Exposes models from all currently configured free providers.
    """
    data = []
    seen = set()

    # Add standard universal aliases
    aliases = ["auto", "fast-smart", "llama-3.3-70b", "llama-3.1-8b", "gpt-4o-mini", "gemini-flash"]
    for a in aliases:
        data.append({
            "id": a,
            "object": "model",
            "created": 1700000000,
            "owned_by": "zerogateway",
            "permission": [],
            "root": a,
            "parent": None
        })
        seen.add(a)

    for p in router_instance.get_configured_providers():
        for m in p.models:
            if m.id not in seen:
                data.append({
                    "id": m.id,
                    "object": "model",
                    "created": 1700000000,
                    "owned_by": p.id,
                    "permission": [],
                    "root": m.id,
                    "parent": None
                })
                seen.add(m.id)

    return {"object": "list", "data": data}

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest, http_request: Request):
    """
    OpenAI-compatible chat completions endpoint with automatic failover.
    Supports optional per-request header overrides:
    - X-Enable-Key-Rotation: true/false
    - X-Enable-Provider-Rotation: true/false
    """
    key_rot_hdr = http_request.headers.get("x-enable-key-rotation")
    prov_rot_hdr = http_request.headers.get("x-enable-provider-rotation")

    orig_key_rot = router_instance.enable_key_rotation
    orig_prov_rot = router_instance.enable_provider_rotation

    if key_rot_hdr is not None:
        router_instance.enable_key_rotation = key_rot_hdr.lower() in ("true", "1", "yes")
    if prov_rot_hdr is not None:
        router_instance.enable_provider_rotation = prov_rot_hdr.lower() in ("true", "1", "yes")

    try:
        if request.stream:
            return StreamingResponse(
                router_instance.stream_chat_completion(request),
                media_type="text/event-stream"
            )

        response_data = router_instance.execute_chat_completion(request)
        return JSONResponse(content=response_data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    finally:
        router_instance.enable_key_rotation = orig_key_rot
        router_instance.enable_provider_rotation = orig_prov_rot


def start_server(host: str = "0.0.0.0", port: int = 8080):
    import uvicorn
    print(f"🚀 Starting Zerogateway Proxy at http://{host}:{port}...")
    uvicorn.run(app, host=host, port=port)
