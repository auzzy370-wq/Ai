"""Tests for all three Hayabusa bot tiers and the dispatch engine."""

import pytest

from ai_app.hayabusa import decide, simulate
from ai_app.hayabusa.decision import ActionType, BotDecision, SimulationResult
from ai_app.hayabusa.elite_ai import recommend_build
from ai_app.hayabusa.game_state import (
    BotTier,
    Enemy,
    EnemySkillCooldowns,
    GameState,
    HeroRole,
    JungleCamp,
    Lane,
    MapVision,
    MinionWave,
    Position,
    SkillCooldowns,
)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


def _pos(x: float = 0.5, y: float = 0.5) -> Position:
    return Position(x=x, y=y)


def _vision(coverage: float = 0.6) -> MapVision:
    return MapVision(coverage=coverage, wards_placed=2, enemy_wards_detected=0)


def _base_state(tier: BotTier = BotTier.BASIC, **kwargs) -> GameState:
    defaults = dict(
        hp_pct=0.80,
        energy=80.0,
        position=_pos(),
        game_time=120,
        tier=tier,
        map_vision=_vision(),
    )
    defaults.update(kwargs)
    return GameState(**defaults)


def _enemy(
    hero_id: str = "layla",
    role: HeroRole = HeroRole.MARKSMAN,
    hp_pct: float = 0.50,
    distance: float = 0.12,
    visible: bool = True,
    escape_cd: float = 0.0,
    burst_cd: float = 0.0,
    ult_cd: float = 0.0,
    isolated: bool = False,
    cc_immune: bool = False,
) -> Enemy:
    return Enemy(
        hero_id=hero_id,
        role=role,
        position=_pos(0.5 + distance, 0.5),
        hp_pct=hp_pct,
        distance=distance,
        is_visible=visible,
        cooldowns=EnemySkillCooldowns(
            escape_skill=escape_cd, burst_skill=burst_cd, ultimate=ult_cd
        ),
        is_isolated=isolated,
        is_cc_immune=cc_immune,
    )


def _camp(camp_id: str = "red_buff", respawn_in: float = 0) -> JungleCamp:
    return JungleCamp(
        camp_id=camp_id,
        position=_pos(0.3, 0.3),
        respawn_in=respawn_in,
    )


def _wave(lane: Lane = Lane.GOLD) -> MinionWave:
    return MinionWave(lane=lane, position=_pos(0.45, 0.5), count=6)


# ---------------------------------------------------------------------------
# Basic bot
# ---------------------------------------------------------------------------


class TestBasicBot:
    def test_retreats_when_low_hp(self):
        state = _base_state(hp_pct=0.25, tier=BotTier.BASIC)
        decision = decide(state)
        assert decision.action == ActionType.RETREAT

    def test_retreat_threshold_boundary(self):
        """HP exactly at the 30% threshold is NOT below it — bot should not retreat."""
        state = _base_state(hp_pct=0.30, tier=BotTier.BASIC)
        decision = decide(state)
        assert decision.action != ActionType.RETREAT

    def test_retreat_just_below_threshold(self):
        """HP just below 30% threshold triggers retreat."""
        state = _base_state(hp_pct=0.29, tier=BotTier.BASIC)
        decision = decide(state)
        assert decision.action == ActionType.RETREAT

    def test_above_threshold_does_not_retreat(self):
        state = _base_state(hp_pct=0.31, tier=BotTier.BASIC)
        decision = decide(state)
        assert decision.action != ActionType.RETREAT

    def test_engages_enemy_in_range(self):
        enemy = _enemy(distance=0.10, hp_pct=0.55)
        state = _base_state(
            hp_pct=0.80,
            tier=BotTier.BASIC,
            enemies=[enemy],
            skill_cooldowns=SkillCooldowns(skill_1=0, skill_2=0),
        )
        decision = decide(state)
        assert decision.action == ActionType.ENGAGE_COMBO
        assert decision.target_id == "layla"

    def test_no_engage_when_skills_on_cooldown(self):
        enemy = _enemy(distance=0.10, hp_pct=0.55)
        state = _base_state(
            hp_pct=0.80,
            tier=BotTier.BASIC,
            enemies=[enemy],
            skill_cooldowns=SkillCooldowns(skill_1=5.0, skill_2=3.0),
            jungle_camps=[_camp()],
        )
        decision = decide(state)
        # Should farm instead since skills aren't ready
        assert decision.action != ActionType.ENGAGE_COMBO

    def test_farms_jungle_when_safe(self):
        state = _base_state(
            tier=BotTier.BASIC,
            jungle_camps=[_camp("red_buff")],
        )
        decision = decide(state)
        assert decision.action == ActionType.FARM_JUNGLE
        assert decision.target_id == "red_buff"

    def test_clears_wave_when_no_camps(self):
        state = _base_state(
            tier=BotTier.BASIC,
            minion_waves=[_wave()],
        )
        decision = decide(state)
        assert decision.action == ActionType.CLEAR_WAVE

    def test_roams_when_nothing_available(self):
        state = _base_state(tier=BotTier.BASIC)
        decision = decide(state)
        assert decision.action == ActionType.ROAM

    def test_does_not_engage_tank(self):
        """Basic bot should not engage a tank-HP enemy above threshold."""
        tank = _enemy(hero_id="tigreal", role=HeroRole.TANK, hp_pct=0.80, distance=0.10)
        state = _base_state(
            tier=BotTier.BASIC,
            enemies=[tank],
            skill_cooldowns=SkillCooldowns(),
        )
        decision = decide(state)
        # hp_pct 0.80 > _COMBO_HP_THRESHOLD(0.70): should not engage
        assert decision.action != ActionType.ENGAGE_COMBO

    def test_decision_has_required_fields(self):
        state = _base_state(tier=BotTier.BASIC)
        decision = decide(state)
        assert isinstance(decision, BotDecision)
        assert decision.tier == BotTier.BASIC
        assert 0.0 <= decision.confidence <= 1.0
        assert decision.reasoning


# ---------------------------------------------------------------------------
# Advanced bot
# ---------------------------------------------------------------------------


class TestAdvancedBot:
    def test_retreat_critical_hp(self):
        state = _base_state(hp_pct=0.20, tier=BotTier.ADVANCED)
        decision = decide(state)
        assert decision.action in (ActionType.RETREAT, ActionType.RECALL_TO_BASE)

    def test_wards_when_vision_low_and_enemies_missing(self):
        state = _base_state(
            tier=BotTier.ADVANCED,
            map_vision=MapVision(coverage=0.20, wards_placed=0, enemy_wards_detected=0),
        )
        # No enemies visible — all 5 are missing
        decision = decide(state)
        assert decision.action == ActionType.PLACE_WARD

    def test_assassinates_marksman_over_tank(self):
        marksman = _enemy("layla", HeroRole.MARKSMAN, hp_pct=0.40, distance=0.10, ult_cd=20.0)
        tank = _enemy("tigreal", HeroRole.TANK, hp_pct=0.30, distance=0.08)
        state = _base_state(
            tier=BotTier.ADVANCED,
            enemies=[tank, marksman],
            skill_cooldowns=SkillCooldowns(),
        )
        decision = decide(state)
        # Marksman should be preferred over tank
        if decision.action == ActionType.ENGAGE_COMBO:
            assert decision.target_id == "layla"

    def test_no_ultimate_on_tank(self):
        tank = _enemy("tigreal", HeroRole.TANK, hp_pct=0.40, distance=0.10, ult_cd=20.0)
        state = _base_state(
            tier=BotTier.ADVANCED,
            enemies=[tank],
            skill_cooldowns=SkillCooldowns(ultimate=0.0),
        )
        decision = decide(state)
        # Even if engaging, should not set secondary = USE_ULTIMATE for a tank
        if decision.action == ActionType.ENGAGE_COMBO and decision.target_id == "tigreal":
            assert decision.secondary_action != ActionType.USE_ULTIMATE

    def test_splits_when_gold_lead(self):
        state = _base_state(
            tier=BotTier.ADVANCED,
            game_time=600,  # mid game
            gold=2500,
            ally_count_nearby=0,
        )
        decision = decide(state)
        assert decision.action == ActionType.SPLIT_PUSH

    def test_tier_label_correct(self):
        state = _base_state(tier=BotTier.ADVANCED)
        decision = decide(state)
        assert decision.tier == BotTier.ADVANCED


# ---------------------------------------------------------------------------
# Elite AI
# ---------------------------------------------------------------------------


class TestEliteAI:
    def test_retreat_on_critical_hp(self):
        state = _base_state(hp_pct=0.15, tier=BotTier.ELITE)
        decision = decide(state)
        assert decision.action in (ActionType.RETREAT, ActionType.RECALL_TO_BASE)

    def test_never_wastes_ultimate_on_tank(self):
        """Elite AI must not use ultimate on a tank."""
        tank = _enemy("tigreal", HeroRole.TANK, hp_pct=0.50, distance=0.10)
        state = _base_state(
            tier=BotTier.ELITE,
            enemies=[tank],
            skill_cooldowns=SkillCooldowns(ultimate=0.0),
        )
        decision = decide(state)
        if decision.target_id == "tigreal":
            assert decision.secondary_action != ActionType.USE_ULTIMATE

    def test_prefers_isolated_target(self):
        isolated = _enemy("layla", HeroRole.MARKSMAN, hp_pct=0.40, distance=0.12, isolated=True)
        crowded = _enemy("granger", HeroRole.MARKSMAN, hp_pct=0.35, distance=0.10, isolated=False)
        state = _base_state(
            tier=BotTier.ELITE,
            enemies=[crowded, isolated],
            skill_cooldowns=SkillCooldowns(),
        )
        decision = decide(state)
        if decision.action == ActionType.ENGAGE_COMBO:
            # Isolated target should score higher
            assert decision.target_id == "layla"

    def test_secures_contested_lord(self):
        state = _base_state(
            tier=BotTier.ELITE,
            is_objective_contested=True,
            objective_type="lord",
            ally_count_nearby=3,
        )
        decision = decide(state)
        assert decision.action == ActionType.SECURE_OBJECTIVE

    def test_confidence_in_range(self):
        state = _base_state(tier=BotTier.ELITE)
        decision = decide(state)
        assert 0.0 <= decision.confidence <= 1.0

    def test_reasoning_non_empty(self):
        state = _base_state(tier=BotTier.ELITE)
        decision = decide(state)
        assert len(decision.reasoning) > 0

    def test_tier_label_correct(self):
        state = _base_state(tier=BotTier.ELITE)
        decision = decide(state)
        assert decision.tier == BotTier.ELITE


# ---------------------------------------------------------------------------
# Dynamic build recommendation
# ---------------------------------------------------------------------------


class TestBuildRecommendation:
    def test_anti_tank_build_when_multiple_tanks(self):
        tanks = [
            _enemy("tigreal", HeroRole.TANK),
            _enemy("khufra", HeroRole.TANK),
        ]
        state = _base_state(tier=BotTier.ELITE, enemies=tanks)
        build = recommend_build(state)
        assert "Malefic Roar" in build

    def test_sustain_build_when_low_hp_vs_burst(self):
        mage = _enemy("cecilion", HeroRole.MAGE)
        state = _base_state(tier=BotTier.ELITE, hp_pct=0.40, enemies=[mage])
        build = recommend_build(state)
        assert "Haas Claws" in build

    def test_burst_build_default(self):
        state = _base_state(tier=BotTier.ELITE)
        build = recommend_build(state)
        assert "Blade of Despair" in build

    def test_build_returns_list_of_strings(self):
        state = _base_state(tier=BotTier.ELITE)
        build = recommend_build(state)
        assert isinstance(build, list)
        assert all(isinstance(item, str) for item in build)


# ---------------------------------------------------------------------------
# Simulation engine
# ---------------------------------------------------------------------------


class TestSimulationEngine:
    def test_simulate_returns_correct_tick_count(self):
        state = _base_state(
            tier=BotTier.BASIC,
            jungle_camps=[_camp("red_buff"), _camp("blue_buff")],
        )
        result = simulate(state, ticks=5)
        assert isinstance(result, SimulationResult)
        assert result.total_ticks == 5
        assert len(result.decisions) == 5

    def test_simulate_all_tiers(self):
        for tier in BotTier:
            state = _base_state(tier=tier, jungle_camps=[_camp()])
            result = simulate(state, ticks=3)
            assert result.tier == tier
            assert len(result.decisions) == 3

    def test_simulate_tracks_retreats(self):
        state = _base_state(tier=BotTier.BASIC, hp_pct=0.20)
        result = simulate(state, ticks=5)
        assert result.retreats_triggered >= 1

    def test_simulate_tracks_jungle_camps(self):
        state = _base_state(
            tier=BotTier.BASIC,
            hp_pct=0.90,
            jungle_camps=[_camp("red_buff"), _camp("blue_buff")],
        )
        result = simulate(state, ticks=5)
        assert result.camps_cleared >= 1

    def test_simulate_summary_non_empty(self):
        state = _base_state(tier=BotTier.BASIC)
        result = simulate(state, ticks=3)
        assert isinstance(result.summary, str)
        assert len(result.summary) > 0


# ---------------------------------------------------------------------------
# API endpoints (integration)
# ---------------------------------------------------------------------------


class TestHayabusaAPI:
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient

        from ai_app.main import app

        return TestClient(app)

    def _state_payload(self, tier: str = "basic", **overrides) -> dict:
        base = {
            "hp_pct": 0.80,
            "energy": 80.0,
            "position": {"x": 0.5, "y": 0.5},
            "game_time": 120,
            "map_vision": {
                "coverage": 0.6,
                "wards_placed": 2,
                "enemy_wards_detected": 0,
            },
        }
        base.update(overrides)
        return {"state": base, "tier": tier}

    def test_info_endpoint(self, client):
        resp = client.get("/api/hayabusa/info")
        assert resp.status_code == 200
        data = resp.json()
        assert "tiers" in data
        assert len(data["tiers"]) == 3
        tiers = {t["tier"] for t in data["tiers"]}
        assert tiers == {"basic", "advanced", "elite"}

    def test_decide_basic(self, client):
        resp = client.post("/api/hayabusa/decide", json=self._state_payload("basic"))
        assert resp.status_code == 200
        data = resp.json()
        assert "action" in data
        assert data["tier"] == "basic"
        assert "reasoning" in data

    def test_decide_advanced(self, client):
        resp = client.post("/api/hayabusa/decide", json=self._state_payload("advanced"))
        assert resp.status_code == 200
        assert resp.json()["tier"] == "advanced"

    def test_decide_elite(self, client):
        resp = client.post("/api/hayabusa/decide", json=self._state_payload("elite"))
        assert resp.status_code == 200
        assert resp.json()["tier"] == "elite"

    def test_decide_low_hp_retreats(self, client):
        payload = self._state_payload("basic", hp_pct=0.20)
        resp = client.post("/api/hayabusa/decide", json=payload)
        assert resp.status_code == 200
        assert resp.json()["action"] in ("retreat", "recall_to_base")

    def test_simulate_endpoint(self, client):
        payload = {
            "initial_state": self._state_payload("basic")["state"],
            "tier": "basic",
            "ticks": 5,
        }
        resp = client.post("/api/hayabusa/simulate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_ticks"] == 5
        assert len(data["decisions"]) == 5

    def test_simulate_max_ticks_validation(self, client):
        payload = {
            "initial_state": self._state_payload("basic")["state"],
            "tier": "basic",
            "ticks": 999,  # above limit of 60
        }
        resp = client.post("/api/hayabusa/simulate", json=payload)
        assert resp.status_code == 422

    def test_build_endpoint(self, client):
        resp = client.post("/api/hayabusa/build", json=self._state_payload("elite"))
        assert resp.status_code == 200
        data = resp.json()
        assert "recommended_build" in data
        assert isinstance(data["recommended_build"], list)

    def test_decide_invalid_hp_rejected(self, client):
        payload = self._state_payload("basic")
        payload["state"]["hp_pct"] = 2.0  # invalid > 1
        resp = client.post("/api/hayabusa/decide", json=payload)
        assert resp.status_code == 422
