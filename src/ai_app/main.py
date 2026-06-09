import json
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from ai_app.config import get_cors_origins
from ai_app.models import ChatRequest, ChatResponse, StatusResponse
from ai_app.responder import generate_reply, get_status_details, stream_reply_events

load_dotenv()

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Ai", version="0.1.0")

cors_origins = get_cors_origins()
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/status", response_model=StatusResponse)
def status() -> StatusResponse:
    mode, model, mock_forced, reason = get_status_details()
    return StatusResponse(mode=mode, model=model, mock_forced=mock_forced, reason=reason)


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    reply, model = generate_reply(request.message, request.history)
    return ChatResponse(reply=reply, model=model)


@app.post("/api/chat/stream")
def chat_stream(request: ChatRequest) -> StreamingResponse:
    def event_stream():
        for event in stream_reply_events(request.message, request.history):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
