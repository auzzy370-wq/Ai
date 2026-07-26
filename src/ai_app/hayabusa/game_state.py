"""Pydantic models representing a Hayabusa game-state snapshot."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class BotTier(StrEnum):
    BASIC = "basic"
    ADVANCED = "advanced"
    ELITE = "elite"


class HeroRole(StrEnum):
    TANK = "tank"
    FIGHTER = "fighter"
    ASSASSIN = "assassin"
    MAGE = "mage"
    MARKSMAN = "marksman"
    SUPPORT = "support"


class GamePhase(StrEnum):
    EARLY = "early"   # 0–5 min
    MID = "mid"       # 5–15 min
    LATE = "late"     # 15+ min


class Lane(StrEnum):
    GOLD = "gold"
    MID = "mid"
    EXP = "exp"


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------


class Position(BaseModel):
    """Normalised map position (0.0 = top/left, 1.0 = bottom/right)."""

    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)


class SkillCooldowns(BaseModel):
    """Remaining cooldown in seconds for each of Hayabusa's abilities."""

    skill_1: float = Field(default=0.0, ge=0.0, description="Phantom Shuriken CD")
    skill_2: float = Field(default=0.0, ge=0.0, description="Quad Shadow CD")
    ultimate: float = Field(default=0.0, ge=0.0, description="Ougi: Shadow Kill CD")


class EnemySkillCooldowns(BaseModel):
    """Observed/estimated cooldowns for an enemy hero."""

    cc_skill: float = Field(default=0.0, ge=0.0)
    burst_skill: float = Field(default=0.0, ge=0.0)
    escape_skill: float = Field(default=0.0, ge=0.0)
    ultimate: float = Field(default=0.0, ge=0.0)


class Enemy(BaseModel):
    hero_id: str
    role: HeroRole
    position: Position
    hp_pct: float = Field(ge=0.0, le=1.0, description="HP as a fraction 0–1")
    distance: float = Field(ge=0.0, description="Distance from Hayabusa in map units")
    is_visible: bool = True
    cooldowns: EnemySkillCooldowns = Field(default_factory=EnemySkillCooldowns)
    is_cc_immune: bool = False
    is_isolated: bool = Field(
        default=False,
        description="True when this enemy has no ally within 2 map units",
    )


class Shadow(BaseModel):
    """A placed Quad-Shadow instance."""

    shadow_id: int = Field(ge=1, le=3)
    position: Position
    is_active: bool = True


class JungleCamp(BaseModel):
    camp_id: str = Field(description="e.g. 'lord', 'turtle', 'red_buff', 'blue_buff', 'crab'")
    position: Position
    respawn_in: float = Field(ge=0.0, description="Seconds until the camp is alive; 0 = now")
    is_invaded: bool = False


class MinionWave(BaseModel):
    lane: Lane
    position: Position
    count: int = Field(ge=0)
    has_siege_minion: bool = False


class MapVision(BaseModel):
    coverage: float = Field(ge=0.0, le=1.0, description="Fraction of map under friendly vision")
    wards_placed: int = Field(ge=0)
    enemy_wards_detected: int = Field(ge=0)
    last_seen_enemies: list[dict] = Field(
        default_factory=list,
        description="[{hero_id, position, seconds_ago}] for out-of-vision enemies",
    )


# ---------------------------------------------------------------------------
# Top-level game state
# ---------------------------------------------------------------------------


class GameState(BaseModel):
    """Complete snapshot of the game world as perceived by Hayabusa's bot."""

    # --- Hayabusa status ---
    hp_pct: float = Field(ge=0.0, le=1.0, description="Current HP fraction")
    energy: float = Field(ge=0.0, le=100.0, description="Current energy (max 100)")
    position: Position
    shadows: list[Shadow] = Field(default_factory=list, max_length=3)
    skill_cooldowns: SkillCooldowns = Field(default_factory=SkillCooldowns)
    active_shadow_count: int = Field(default=0, ge=0, le=3)

    # --- Game context ---
    game_time: int = Field(ge=0, description="Elapsed seconds")
    gold: int = Field(default=0, ge=0)
    current_items: list[str] = Field(default_factory=list)
    kills: int = Field(default=0, ge=0)
    deaths: int = Field(default=0, ge=0)

    # --- Map state ---
    enemies: list[Enemy] = Field(default_factory=list, max_length=5)
    jungle_camps: list[JungleCamp] = Field(default_factory=list)
    minion_waves: list[MinionWave] = Field(default_factory=list)
    map_vision: MapVision = Field(default_factory=MapVision)
    ally_count_nearby: int = Field(default=0, ge=0, le=4)
    is_objective_contested: bool = False
    objective_type: Literal["lord", "turtle", "none"] = "none"

    # --- Bot configuration ---
    tier: BotTier = BotTier.BASIC

    @property
    def game_phase(self) -> GamePhase:
        if self.game_time < 300:
            return GamePhase.EARLY
        if self.game_time < 900:
            return GamePhase.MID
        return GamePhase.LATE

    @property
    def visible_enemies(self) -> list[Enemy]:
        return [e for e in self.enemies if e.is_visible]

    @property
    def nearest_enemy(self) -> Enemy | None:
        visible = self.visible_enemies
        return min(visible, key=lambda e: e.distance) if visible else None

    @property
    def available_jungle_camps(self) -> list[JungleCamp]:
        return [c for c in self.jungle_camps if c.respawn_in == 0 and not c.is_invaded]

    @property
    def skills_ready(self) -> bool:
        cd = self.skill_cooldowns
        return cd.skill_1 == 0.0 and cd.skill_2 == 0.0

    @property
    def ultimate_ready(self) -> bool:
        return self.skill_cooldowns.ultimate == 0.0
