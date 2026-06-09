from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse

from ai_app.models import ChatRequest, ChatResponse, StatusResponse
from ai_app.responder import generate_reply, get_runtime_mode

load_dotenv()

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Ai", version="0.1.0")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/status", response_model=StatusResponse)
def status() -> StatusResponse:
    mode, model = get_runtime_mode()
    return StatusResponse(mode=mode, model=model)


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    reply, model = generate_reply(request.message, request.history)
    return ChatResponse(reply=reply, model=model)
