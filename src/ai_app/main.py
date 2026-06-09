from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse

from ai_app.models import ChatRequest, ChatResponse
from ai_app.responder import generate_reply

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Ai", version="0.1.0")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    reply, model = generate_reply(request.message)
    return ChatResponse(reply=reply, model=model)
