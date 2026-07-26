"""Pydantic models for bot decisions and simulation results."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field

from ai_app.hayabusa.game_state import BotTier, GamePhase, GameState

# ---------------------------------------------------------------------------
# Action vocabulary
# ---------------------------------------------------------------------------


class ActionType(StrEnum):
    # Survival
    RETREAT = "retreat"
    RECALL_TO_BASE = "recall_to_base"

    # Farming
    FARM_JUNGLE = "farm_jungle"
    CLEAR_WAVE = "clear_wave"
    INVADE_JUNGLE = "invade_jungle"

    # Combat
    ENGAGE_COMBO = "engage_combo"
    USE_SKILL_1 = "use_skill_1"
    USE_SKILL_2 = "use_skill_2"
    USE_ULTIMATE = "use_ultimate"
    POKE = "poke"

    # Shadow mechanics
    PLACE_SHADOW = "place_shadow"
    RECALL_SHADOW = "recall_shadow"
    SHADOW_RESET = "shadow_reset"

    # Macro
    ROAM = "roam"
    SPLIT_PUSH = "split_push"
    JOIN_TEAMFIGHT = "join_teamfight"
    SECURE_OBJECTIVE = "secure_objective"
    PLACE_WARD = "place_ward"
    TRACK_ENEMY = "track_enemy"

    # Passive
    WAIT = "wait"


# ---------------------------------------------------------------------------
# Shadow placement strategy tags
# ---------------------------------------------------------------------------


class ShadowStrategy(StrEnum):
    """Describes why and how a shadow should be placed."""

    ESCAPE_ROUTE = "place_escape_shadow_before_engaging"
    RESET_SETUP = "place_for_ultimate_reset_chain"
    VISION_WARD = "place_in_bush_for_vision"
    ENGAGE_APPROACH = "place_ahead_to_gap_close"
    RETREAT_ANCHOR = "place_behind_to_have_teleport_anchor"


# ---------------------------------------------------------------------------
# Decision
# ---------------------------------------------------------------------------


class BotDecision(BaseModel):
    """The bot's chosen action and supporting reasoning."""

    action: ActionType
    target_id: str | None = Field(default=None, description="hero_id or camp_id")
    reasoning: str = Field(description="Human-readable explanation of the decision")
    confidence: float = Field(ge=0.0, le=1.0)
    secondary_action: ActionType | None = None
    shadow_strategy: ShadowStrategy | None = None
    game_phase: GamePhase
    tier: BotTier


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------


class SimulationTick(BaseModel):
    tick: int = Field(ge=0, description="Tick number (each tick = 1 simulated second)")
    game_time: int
    action: ActionType
    target_id: str | None = None
    hp_pct: float
    energy: float
    gold: int
    reasoning: str
    shadow_strategy: ShadowStrategy | None = None


class SimulationResult(BaseModel):
    tier: BotTier
    total_ticks: int
    decisions: list[SimulationTick]
    summary: str
    kills_secured: int = 0
    camps_cleared: int = 0
    waves_cleared: int = 0
    retreats_triggered: int = 0
    ultimates_used: int = 0
    shadows_placed: int = 0


# ---------------------------------------------------------------------------
# API request/response wrappers
# ---------------------------------------------------------------------------


class DecideRequest(BaseModel):
    state: GameState
    tier: BotTier = BotTier.BASIC


class SimulateRequest(BaseModel):
    initial_state: GameState
    tier: BotTier = BotTier.BASIC
    ticks: int = Field(default=10, ge=1, le=60, description="Simulated seconds to run")
