import time
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from ..models import ChatCompletionRequest
from ..router import FreeLLMRouter

app = FastAPI(
    title="Free LLM Proxy Gateway",
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

router_instance = FreeLLMRouter()

@app.get("/")
def index():
    return {
        "service": "Free LLM Proxy Gateway",
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
        "configured_providers": [
            {
                "id": p.id,
                "name": p.name,
                "tier": p.tier.type,
                "auth_type": p.tier.auth_type,
                "models_count": len(p.models),
                "is_throttled": router_instance._is_throttled(p.id)
            }
            for p in configured
        ],
        "stats": router_instance.stats
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
            "owned_by": "free-llm-router",
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
async def chat_completions(request: ChatCompletionRequest):
    """
    OpenAI-compatible chat completions endpoint with automatic failover.
    """
    if request.stream:
        return StreamingResponse(
            router_instance.stream_chat_completion(request),
            media_type="text/event-stream"
        )

    try:
        response_data = router_instance.execute_chat_completion(request)
        return JSONResponse(content=response_data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

def start_server(host: str = "0.0.0.0", port: int = 8080):
    import uvicorn
    print(f"🚀 Starting Free LLM Proxy at http://{host}:{port}...")
    uvicorn.run(app, host=host, port=port)
