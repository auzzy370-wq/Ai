"""Advanced bot (Tier 2) – adaptive, situational Hayabusa AI.

Capabilities:
  - Reads the minimap (reacts to enemy positions and vision gaps).
  - Tracks enemy cooldowns to find safe assassination windows.
  - Selects assassination targets by role priority and vulnerability.
  - Decides between split push and team fight dynamically.
  - Adapts pathing based on available vision.
  - Places shadows strategically before engaging for escape routes.
  - Plays at approximately Mythic-rank level.
"""

from __future__ import annotations

import math

from ai_app.hayabusa.decision import ActionType, BotDecision, ShadowStrategy
from ai_app.hayabusa.game_state import Enemy, GamePhase, GameState, HeroRole

# Tuning constants
_RETREAT_HP = 0.25
_SAFE_ENGAGE_HP = 0.70         # only engage enemies below this
_ASSASSINATION_WINDOW_HP = 0.55  # ideal burst-kill window
_SOLO_ENGAGE_DISTANCE = 0.18
_SHADOW_PLACE_DISTANCE = 0.25  # pre-place shadow before crossing this gap
_SPLIT_PUSH_GOLD_LEAD = 2000   # gold lead required before splitting
_GANK_WARNING_THRESHOLD = 0.35  # low map vision = potential gank risk

# Role assassination priority (lower index = higher priority)
_ROLE_PRIORITY: dict[HeroRole, int] = {
    HeroRole.MARKSMAN: 0,
    HeroRole.MAGE: 1,
    HeroRole.SUPPORT: 2,
    HeroRole.ASSASSIN: 3,
    HeroRole.FIGHTER: 4,
    HeroRole.TANK: 5,
}


def decide(state: GameState) -> BotDecision:
    phase = state.game_phase

    # --- 1. Hard retreat: low HP or surrounded ---
    if _should_retreat(state):
        recall = state.hp_pct < 0.15 or (
            state.hp_pct < 0.20 and state.skill_cooldowns.ultimate > 30
        )
        return BotDecision(
            action=ActionType.RECALL_TO_BASE if recall else ActionType.RETREAT,
            shadow_strategy=_pick_retreat_shadow(state),
            reasoning=_retreat_reason(state),
            confidence=0.96,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 2. Vision check: if map is dark and enemies missing, play safe ---
    if _minimap_gank_risk(state):
        return BotDecision(
            action=ActionType.PLACE_WARD,
            reasoning=(
                f"Map vision is low ({state.map_vision.coverage:.0%}) and "
                f"{_missing_enemy_count(state)} enemies are off-map. "
                "Placing ward before committing."
            ),
            confidence=0.78,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 3. Secure contested objective with team ---
    if _should_secure_objective(state):
        return BotDecision(
            action=ActionType.SECURE_OBJECTIVE,
            target_id=state.objective_type,
            reasoning=(
                f"{state.objective_type.capitalize()} contested. "
                f"{state.ally_count_nearby} allies nearby — securing."
            ),
            confidence=0.88,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 4. Assassination: find the best target ---
    target = _pick_assassination_target(state)
    if target:
        shadow_strat = _pick_engage_shadow_strategy(state)
        can_ult = state.ultimate_ready and _ult_worthy(target)
        return BotDecision(
            action=ActionType.ENGAGE_COMBO,
            target_id=target.hero_id,
            secondary_action=ActionType.USE_ULTIMATE if can_ult else ActionType.SHADOW_RESET,
            shadow_strategy=shadow_strat,
            reasoning=_assassination_reason(target, can_ult, state),
            confidence=_assassination_confidence(target, state),
            game_phase=phase,
            tier=state.tier,
        )

    # --- 5. Macro: split push or join fight ---
    if _should_split_push(state):
        return BotDecision(
            action=ActionType.SPLIT_PUSH,
            reasoning=(
                f"Gold lead ({state.gold:,}) and allies are engaged elsewhere. "
                "Applying split-push pressure."
            ),
            confidence=0.72,
            game_phase=phase,
            tier=state.tier,
        )

    if _should_join_teamfight(state):
        return BotDecision(
            action=ActionType.JOIN_TEAMFIGHT,
            shadow_strategy=ShadowStrategy.ENGAGE_APPROACH,
            reasoning="Team fight in progress — roaming in to assist.",
            confidence=0.80,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 6. Farm with priority ---
    available_camps = state.available_jungle_camps
    if available_camps:
        best = _pick_best_camp(state, available_camps)
        invade = best.is_invaded is False and _should_invade(state, best)
        return BotDecision(
            action=ActionType.INVADE_JUNGLE if invade else ActionType.FARM_JUNGLE,
            target_id=best.camp_id,
            reasoning=(
                f"{'Invading' if invade else 'Farming'} '{best.camp_id}' — "
                f"optimal gold income for {phase.value} game."
            ),
            confidence=0.82,
            game_phase=phase,
            tier=state.tier,
        )

    # --- 7. Clear waves ---
    if state.minion_waves:
        wave = state.minion_waves[0]
        return BotDecision(
            action=ActionType.CLEAR_WAVE,
            reasoning=(
                f"No camps available. Clearing {wave.lane.value} lane "
                f"({'siege' if wave.has_siege_minion else 'standard'} wave)."
            ),
            confidence=0.70,
            game_phase=phase,
            tier=state.tier,
        )

    return BotDecision(
        action=ActionType.ROAM,
        reasoning="Pathing to next control point based on vision map.",
        confidence=0.55,
        game_phase=phase,
        tier=state.tier,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _should_retreat(state: GameState) -> bool:
    if state.hp_pct < _RETREAT_HP:
        return True
    if state.hp_pct < 0.40 and len(state.visible_enemies) >= 2:
        return True
    return False


def _retreat_reason(state: GameState) -> str:
    if state.hp_pct < 0.15:
        return f"HP critical ({state.hp_pct:.0%}) — recalling to base."
    if len(state.visible_enemies) >= 2:
        return (
            f"Outnumbered ({len(state.visible_enemies)} enemies) at {state.hp_pct:.0%} HP. "
            "Retreating."
        )
    return f"HP at {state.hp_pct:.0%} — falling back to tower."


def _pick_retreat_shadow(state: GameState) -> ShadowStrategy | None:
    if state.active_shadow_count > 0:
        return ShadowStrategy.RETREAT_ANCHOR
    return None


def _minimap_gank_risk(state: GameState) -> bool:
    if state.map_vision.coverage < _GANK_WARNING_THRESHOLD:
        return _missing_enemy_count(state) >= 2
    return False


def _missing_enemy_count(state: GameState) -> int:
    visible_ids = {e.hero_id for e in state.visible_enemies}
    last_seen_ids = {e["hero_id"] for e in state.map_vision.last_seen_enemies}
    # Enemies we know exist but can't see and have no recent position
    all_known = visible_ids | last_seen_ids
    return max(0, 5 - len(all_known))


def _should_secure_objective(state: GameState) -> bool:
    return state.is_objective_contested and state.ally_count_nearby >= 1


def _pick_assassination_target(state: GameState) -> Enemy | None:
    candidates = [
        e for e in state.visible_enemies
        if e.hp_pct <= _SAFE_ENGAGE_HP
        and e.distance <= _SOLO_ENGAGE_DISTANCE
        and not e.is_cc_immune
        and e.cooldowns.ultimate > 0  # their ultimate is on CD
    ]
    if not candidates:
        return None
    return min(
        candidates,
        key=lambda e: (
            _ROLE_PRIORITY.get(e.role, 99),
            e.hp_pct,
            -e.cooldowns.burst_skill,  # prefer enemies whose burst is on cooldown
        ),
    )


def _ult_worthy(enemy: Enemy) -> bool:
    """Never waste ultimate on tanks or enemies with full HP."""
    if enemy.role == HeroRole.TANK:
        return False
    return enemy.hp_pct <= 0.60


def _assassination_confidence(enemy: Enemy, state: GameState) -> float:
    base = 0.80
    if enemy.is_isolated:
        base += 0.10
    if enemy.hp_pct <= 0.35:
        base += 0.05
    if enemy.cooldowns.escape_skill > 5:
        base += 0.05
    if state.ally_count_nearby >= 1:
        base += 0.05
    return min(base, 0.97)


def _assassination_reason(enemy: Enemy, can_ult: bool, state: GameState) -> str:
    parts = [
        f"Targeting '{enemy.hero_id}' ({enemy.role.value}) at {enemy.hp_pct:.0%} HP.",
    ]
    if enemy.is_isolated:
        parts.append("Target is isolated.")
    if enemy.cooldowns.ultimate > 0:
        parts.append(f"Enemy ultimate on {enemy.cooldowns.ultimate:.0f}s CD.")
    if can_ult:
        parts.append("Using ultimate for guaranteed kill.")
    else:
        parts.append("Combo only (S1 → S2 → AA); saving ultimate.")
    return " ".join(parts)


def _pick_engage_shadow_strategy(state: GameState) -> ShadowStrategy:
    if state.active_shadow_count < 1:
        return ShadowStrategy.ESCAPE_ROUTE
    if state.active_shadow_count == 1:
        return ShadowStrategy.RESET_SETUP
    return ShadowStrategy.ENGAGE_APPROACH


def _should_split_push(state: GameState) -> bool:
    if state.gold < _SPLIT_PUSH_GOLD_LEAD:
        return False
    if state.ally_count_nearby >= 3:
        return False
    return state.game_phase in (GamePhase.MID, GamePhase.LATE)


def _should_join_teamfight(state: GameState) -> bool:
    return state.ally_count_nearby >= 2 and len(state.visible_enemies) >= 2


def _pick_best_camp(state: GameState, camps) -> object:
    def camp_score(camp) -> float:
        dx = state.position.x - camp.position.x
        dy = state.position.y - camp.position.y
        dist = math.sqrt(dx**2 + dy**2)
        _CAMP_VALUES = {"lord": 100, "turtle": 80, "red_buff": 60, "blue_buff": 50}
        priority = _CAMP_VALUES.get(camp.camp_id, 30)
        return priority - dist * 40

    return max(camps, key=camp_score)


def _should_invade(state: GameState, camp) -> bool:
    if state.game_phase != GamePhase.EARLY:
        return False
    if state.hp_pct < 0.60:
        return False
    return state.gold > 2000 and not state.visible_enemies
