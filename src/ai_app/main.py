from fastapi import FastAPI

from ai_app.models import ChatRequest, ChatResponse
from ai_app.responder import generate_reply

app = FastAPI(title="Ai", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    reply, model = generate_reply(request.message)
    return ChatResponse(reply=reply, model=model)
