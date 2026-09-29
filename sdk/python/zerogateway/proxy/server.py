import time
from pathlib import Path
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse
from ..models import ChatCompletionRequest
from ..router import ZeroGatewayRouter

app = FastAPI(
    title="Zerogateway Proxy",
    description="Drop-in OpenAI-compatible proxy with automatic fallback across free LLM providers",
    version="0.1.1"
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
def index(request: Request):
    accept = request.headers.get("accept", "")
    # Check bundled data first, then repository docs
    landing_file = Path(__file__).resolve().parent.parent / "data" / "index.html"
    if not landing_file.exists():
        landing_file = Path(__file__).resolve().parents[4] / "docs" / "index.html"

    if "text/html" in accept and landing_file.exists():
        return HTMLResponse(content=landing_file.read_text(encoding="utf-8"))

    return {
        "service": "Zerogateway Proxy",
        "status": "online",
        "documentation": "/docs",
        "landing_page": "/index.html",
        "active_providers": [p.name for p in router_instance.get_configured_providers()]
    }

@app.get("/zerogateway.browser.global.js")
def browser_bundle():
    bundle_file = Path(__file__).resolve().parent.parent / "data" / "zerogateway.browser.global.js"
    if not bundle_file.exists():
        bundle_file = Path(__file__).resolve().parents[4] / "docs" / "zerogateway.browser.global.js"
    if bundle_file.exists():
        return Response(content=bundle_file.read_bytes(), media_type="application/javascript")
    raise HTTPException(status_code=404, detail="Browser bundle not found")

@app.get("/index.html")
def landing_html():
    landing_file = Path(__file__).resolve().parent.parent / "data" / "index.html"
    if not landing_file.exists():
        landing_file = Path(__file__).resolve().parents[4] / "docs" / "index.html"
    if landing_file.exists():
        return HTMLResponse(content=landing_file.read_text(encoding="utf-8"))
    raise HTTPException(status_code=404, detail="Landing page not found")



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
