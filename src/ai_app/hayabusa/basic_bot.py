"""Basic bot (Tier 1) – predictable, rule-based Hayabusa AI.

Capabilities:
  - Farms jungle efficiently.
  - Clears minion waves.
  - Executes a fixed skill combo (S1 → S2 → AA → Ultimate).
  - Retreats when HP < 30%.
  - Can beat average AI but has no adaptive decision-making.
"""

from __future__ import annotations

from ai_app.hayabusa.decision import ActionType, BotDecision, ShadowStrategy
from ai_app.hayabusa.game_state import GameState

# Hayabusa ability constants (MLBB values)
_ENGAGE_DISTANCE = 0.15      # max gap-close distance without Skill 2
_RETREAT_HP = 0.30           # disengage below this HP fraction
_COMBO_HP_THRESHOLD = 0.70   # only engage enemies below this HP
_WAVE_PRIORITY_DISTANCE = 0.10  # wave within this distance gets cleared first


def decide(state: GameState) -> BotDecision:
    """Return a single decision for the basic bot given the current state."""

    phase = state.game_phase

    # --- 1. Survival: retreat when low HP ---
    if state.hp_pct < _RETREAT_HP:
        return BotDecision(
            action=ActionType.RETREAT,
            reasoning=(
                f"HP at {state.hp_pct:.0%} — below safe threshold ({_RETREAT_HP:.0%}). "
                "Retreating to nearest tower."
            ),
            confidence=0.95,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 2. Combat: engage if enemy is in range and combo is ready ---
    nearest = state.nearest_enemy
    if nearest and nearest.distance <= _ENGAGE_DISTANCE and state.skills_ready:
        if nearest.hp_pct <= _COMBO_HP_THRESHOLD and not nearest.is_cc_immune:
            shadow_strat = ShadowStrategy.ESCAPE_ROUTE if state.active_shadow_count < 1 else None
            can_ult = state.ultimate_ready and nearest.hp_pct <= 0.5
            return BotDecision(
                action=ActionType.ENGAGE_COMBO,
                target_id=nearest.hero_id,
                reasoning=(
                    f"Enemy '{nearest.hero_id}' ({nearest.role.value}) "
                    f"at {nearest.hp_pct:.0%} HP within engage range. "
                    "Executing fixed combo: S1 → S2 → Auto"
                    + (" → Ultimate." if can_ult else ".")
                ),
                confidence=0.80,
                secondary_action=ActionType.USE_ULTIMATE if can_ult else None,
                shadow_strategy=shadow_strat,
                game_phase=phase,
                tier=state.tier,
            )

    # --- 3. Objective: help secure a contested Lord/Turtle ---
    if state.is_objective_contested and state.ally_count_nearby >= 2:
        return BotDecision(
            action=ActionType.SECURE_OBJECTIVE,
            target_id=state.objective_type,
            reasoning=(
                f"{state.objective_type.capitalize()} is contested and "
                f"{state.ally_count_nearby} allies are nearby — joining."
            ),
            confidence=0.70,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 4. Farm jungle if a camp is available and no immediate threat ---
    available_camps = state.available_jungle_camps
    if available_camps:
        best_camp = available_camps[0]
        return BotDecision(
            action=ActionType.FARM_JUNGLE,
            target_id=best_camp.camp_id,
            reasoning=(
                f"No threats nearby. Farming '{best_camp.camp_id}' jungle camp "
                f"to build gold advantage."
            ),
            confidence=0.85,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 5. Clear minion waves ---
    close_waves = [
        w for w in state.minion_waves if _wave_distance(state, w) <= _WAVE_PRIORITY_DISTANCE
    ]
    if close_waves:
        wave = close_waves[0]
        return BotDecision(
            action=ActionType.CLEAR_WAVE,
            reasoning=(
                f"No jungle camps available. Clearing {wave.lane.value}-lane minion wave "
                f"({wave.count} minions)."
            ),
            confidence=0.75,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 6. Roam to find something useful ---
    return BotDecision(
        action=ActionType.ROAM,
        reasoning="No immediate priority found. Roaming to next objective.",
        confidence=0.50,
        game_phase=phase,
        tier=state.tier,
    )


def _wave_distance(state: GameState, wave) -> float:
    dx = state.position.x - wave.position.x
    dy = state.position.y - wave.position.y
    return (dx**2 + dy**2) ** 0.5
