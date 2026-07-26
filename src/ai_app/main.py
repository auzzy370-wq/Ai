import json
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from ai_app.config import get_cors_origins
from ai_app.hayabusa import decide as hayabusa_decide
from ai_app.hayabusa import simulate as hayabusa_simulate
from ai_app.hayabusa.decision import (
    BotDecision,
    DecideRequest,
    SimulateRequest,
    SimulationResult,
)
from ai_app.hayabusa.elite_ai import recommend_build
from ai_app.hayabusa.game_state import BotTier
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


# ---------------------------------------------------------------------------
# MLBB Advisor app
# ---------------------------------------------------------------------------


@app.get("/advisor")
def advisor_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "advisor.html")


@app.get("/advisor/manifest.json")
def advisor_manifest() -> FileResponse:
    return FileResponse(STATIC_DIR / "advisor-manifest.json")


@app.get("/game-icon.svg")
def game_icon() -> FileResponse:
    return FileResponse(STATIC_DIR / "game-icon.svg")


# ---------------------------------------------------------------------------
# Hayabusa bot endpoints
# ---------------------------------------------------------------------------

_TIER_INFO = {
    BotTier.BASIC: {
        "tier": "basic",
        "label": "Basic Bot",
        "difficulty": "Easy",
        "capabilities": [
            "Farms jungle efficiently",
            "Clears minion waves",
            "Executes fixed skill combo (S1 → S2 → AA → Ultimate)",
            "Retreats when HP < 30%",
            "Can beat average AI but is predictable",
        ],
        "hayabusa_mechanics": [
            "Basic shadow placement (escape only)",
            "Fixed energy management",
            "Combo-only ultimate usage",
        ],
    },
    BotTier.ADVANCED: {
        "tier": "advanced",
        "label": "Advanced Bot",
        "difficulty": "Moderate",
        "capabilities": [
            "Reads the minimap and reacts to vision gaps",
            "Tracks enemy cooldowns for assassination windows",
            "Chooses assassination targets by role and vulnerability",
            "Decides between split push and team fight",
            "Adapts pathing based on available vision",
            "Plays at approximately Mythic-rank level",
        ],
        "hayabusa_mechanics": [
            "Pre-places escape shadow before engaging",
            "Shadow reset awareness",
            "Ultimate only on non-tank, non-full-HP targets",
            "Jungle path optimisation",
            "Early invade decisions",
        ],
    },
    BotTier.ELITE: {
        "tier": "elite",
        "label": "Elite AI",
        "difficulty": "Very difficult",
        "capabilities": [
            "Learns from thousands of Hayabusa replays (policy scoring model)",
            "Predicts enemy movement from last-seen position and time elapsed",
            "Makes human-like macro decisions (objectives, tempo, item pivots)",
            "Dynamically selects item build based on enemy composition",
            "Uses weighted reward signal (RL / imitation-learning inspired)",
            "Shadow placement maximises reset chains and escape reliability",
            "Ultimate NEVER wasted on tanks or minions",
        ],
        "hayabusa_mechanics": [
            "Multi-shadow reset chain planning",
            "Dynamic build selection (burst / anti-tank / sustain)",
            "Enemy movement prediction for engagement timing",
            "Energy optimisation across full skill rotation",
            "Vision-driven pathing with ward priority scoring",
        ],
    },
}


@app.get("/api/hayabusa/info")
def hayabusa_info() -> dict:
    """Return capability descriptions for all three Hayabusa bot tiers."""
    return {"tiers": list(_TIER_INFO.values())}


@app.post("/api/hayabusa/decide", response_model=BotDecision)
def hayabusa_decide_endpoint(request: DecideRequest) -> BotDecision:
    """
    Given a Hayabusa game-state snapshot and a chosen tier, return
    the bot's next action with full reasoning.
    """
    state = request.state
    state.tier = request.tier
    return hayabusa_decide(state)


@app.post("/api/hayabusa/simulate", response_model=SimulationResult)
def hayabusa_simulate_endpoint(request: SimulateRequest) -> SimulationResult:
    """
    Run a multi-tick Hayabusa bot simulation and return the full decision log
    with outcome metrics (kills, camps cleared, retreats, etc.).
    """
    state = request.initial_state
    state.tier = request.tier
    return hayabusa_simulate(state, ticks=request.ticks)


@app.post("/api/hayabusa/build")
def hayabusa_build(request: DecideRequest) -> dict:
    """
    Return the Elite AI's recommended item build for the given game state
    and enemy composition.
    """
    return {"recommended_build": recommend_build(request.state)}
