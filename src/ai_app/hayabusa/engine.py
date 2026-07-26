"""Dispatch engine — routes game state to the correct bot tier and runs simulations."""

from __future__ import annotations

import copy

from ai_app.hayabusa import advanced_bot, basic_bot, elite_ai
from ai_app.hayabusa.decision import (
    ActionType,
    BotDecision,
    SimulationResult,
    SimulationTick,
)
from ai_app.hayabusa.game_state import BotTier, GameState

# Simulated energy/resource costs per action (approximate MLBB values)
_ENERGY_COST: dict[ActionType, float] = {
    ActionType.ENGAGE_COMBO: 30.0,
    ActionType.USE_SKILL_1: 10.0,
    ActionType.USE_SKILL_2: 15.0,
    ActionType.USE_ULTIMATE: 0.0,  # ultimate does not cost energy
    ActionType.PLACE_SHADOW: 15.0,
    ActionType.SHADOW_RESET: 0.0,
    ActionType.POKE: 10.0,
}

# Simulated gold earned per action per tick
_GOLD_PER_TICK: dict[ActionType, float] = {
    ActionType.FARM_JUNGLE: 45.0,
    ActionType.INVADE_JUNGLE: 55.0,
    ActionType.CLEAR_WAVE: 30.0,
    ActionType.ENGAGE_COMBO: 150.0,  # kill gold (optimistic)
    ActionType.SPLIT_PUSH: 35.0,
    ActionType.SECURE_OBJECTIVE: 200.0,  # objective gold
}

# HP recovery per tick when retreating or idle
_HP_RECOVERY_RETREAT = 0.04
_HP_RECOVERY_IDLE = 0.01


def decide(state: GameState) -> BotDecision:
    """Dispatch to the appropriate tier's decision function."""
    if state.tier == BotTier.BASIC:
        return basic_bot.decide(state)
    if state.tier == BotTier.ADVANCED:
        return advanced_bot.decide(state)
    return elite_ai.decide(state)


def simulate(state: GameState, ticks: int = 10) -> SimulationResult:
    """
    Run a tick-by-tick simulation and collect decisions + outcome metrics.

    Each tick represents ~1 simulated second of gameplay.
    """
    current = copy.deepcopy(state)
    tick_log: list[SimulationTick] = []

    kills = 0
    camps = 0
    waves = 0
    retreats = 0
    ultimates = 0
    shadows_placed = 0

    for tick in range(ticks):
        decision = decide(current)
        action = decision.action

        # --- record tick ---
        tick_log.append(
            SimulationTick(
                tick=tick,
                game_time=current.game_time + tick,
                action=action,
                target_id=decision.target_id,
                hp_pct=current.hp_pct,
                energy=current.energy,
                gold=current.gold,
                reasoning=decision.reasoning,
                shadow_strategy=decision.shadow_strategy,
            )
        )

        # --- apply simplified state changes ---
        current.gold += int(_GOLD_PER_TICK.get(action, 5))
        current.energy = max(
            0.0,
            min(100.0, current.energy - _ENERGY_COST.get(action, 0.0) + 3.0),  # +3 regen/tick
        )

        if action in (ActionType.RETREAT, ActionType.RECALL_TO_BASE):
            current.hp_pct = min(1.0, current.hp_pct + _HP_RECOVERY_RETREAT)
            retreats += 1
        else:
            current.hp_pct = min(1.0, current.hp_pct + _HP_RECOVERY_IDLE)

        if action == ActionType.ENGAGE_COMBO:
            # Simulate killing the target — remove from enemies list
            if decision.target_id and current.enemies:
                current.enemies = [e for e in current.enemies if e.hero_id != decision.target_id]
            kills += 1

        if action in (ActionType.FARM_JUNGLE, ActionType.INVADE_JUNGLE):
            # Consume the first available camp
            available = current.available_jungle_camps
            if available:
                consumed = available[0]
                for camp in current.jungle_camps:
                    if camp.camp_id == consumed.camp_id:
                        camp.respawn_in = 60.0  # standard respawn timer
                        break
            camps += 1

        if action == ActionType.CLEAR_WAVE and current.minion_waves:
            current.minion_waves.pop(0)
            waves += 1

        if action == ActionType.USE_ULTIMATE:
            current.skill_cooldowns.ultimate = 45.0
            ultimates += 1

        if action == ActionType.PLACE_SHADOW:
            current.active_shadow_count = min(3, current.active_shadow_count + 1)
            shadows_placed += 1

        # Tick down cooldowns
        current.skill_cooldowns.skill_1 = max(0.0, current.skill_cooldowns.skill_1 - 1.0)
        current.skill_cooldowns.skill_2 = max(0.0, current.skill_cooldowns.skill_2 - 1.0)
        current.skill_cooldowns.ultimate = max(0.0, current.skill_cooldowns.ultimate - 1.0)

    return SimulationResult(
        tier=state.tier,
        total_ticks=ticks,
        decisions=tick_log,
        summary=_build_summary(
            state.tier, kills, camps, waves, retreats, ultimates, shadows_placed
        ),
        kills_secured=kills,
        camps_cleared=camps,
        waves_cleared=waves,
        retreats_triggered=retreats,
        ultimates_used=ultimates,
        shadows_placed=shadows_placed,
    )


def _build_summary(
    tier: BotTier,
    kills: int,
    camps: int,
    waves: int,
    retreats: int,
    ultimates: int,
    shadows: int,
) -> str:
    tier_labels = {
        BotTier.BASIC: "Basic Bot",
        BotTier.ADVANCED: "Advanced Bot",
        BotTier.ELITE: "Elite AI",
    }
    label = tier_labels[tier]
    parts = [f"[{label}] Simulation complete."]
    parts.append(f"Kills: {kills}, Jungle camps: {camps}, Waves cleared: {waves}.")
    parts.append(f"Retreats: {retreats}, Ultimates used: {ultimates}, Shadows placed: {shadows}.")
    return " ".join(parts)
