"""Tests for Hayabusa game-state models and computed properties."""

import pytest

from ai_app.hayabusa.game_state import (
    Enemy,
    GamePhase,
    GameState,
    HeroRole,
    JungleCamp,
    MapVision,
    Position,
    SkillCooldowns,
)


def _base_state(**kwargs) -> GameState:
    defaults = dict(
        hp_pct=0.80,
        energy=80.0,
        position=Position(x=0.5, y=0.5),
        game_time=120,
        map_vision=MapVision(coverage=0.6, wards_placed=2, enemy_wards_detected=0),
    )
    defaults.update(kwargs)
    return GameState(**defaults)


class TestGamePhase:
    def test_early_phase(self):
        state = _base_state(game_time=0)
        assert state.game_phase == GamePhase.EARLY

    def test_early_phase_boundary(self):
        state = _base_state(game_time=299)
        assert state.game_phase == GamePhase.EARLY

    def test_mid_phase(self):
        state = _base_state(game_time=300)
        assert state.game_phase == GamePhase.MID

    def test_mid_phase_boundary(self):
        state = _base_state(game_time=899)
        assert state.game_phase == GamePhase.MID

    def test_late_phase(self):
        state = _base_state(game_time=900)
        assert state.game_phase == GamePhase.LATE


class TestComputedProperties:
    def _enemy(self, *, visible=True, distance=0.10, hp_pct=0.50) -> Enemy:
        return Enemy(
            hero_id="layla",
            role=HeroRole.MARKSMAN,
            position=Position(x=0.55, y=0.5),
            hp_pct=hp_pct,
            distance=distance,
            is_visible=visible,
        )

    def test_visible_enemies_filters_invisible(self):
        e1 = self._enemy(visible=True)
        e2 = self._enemy(visible=False)
        state = _base_state(enemies=[e1, e2])
        assert len(state.visible_enemies) == 1
        assert state.visible_enemies[0].is_visible

    def test_nearest_enemy_returns_closest(self):
        near = self._enemy(distance=0.05)
        far = self._enemy(distance=0.30)
        near.hero_id = "layla"
        far.hero_id = "granger"
        state = _base_state(enemies=[far, near])
        assert state.nearest_enemy is not None
        assert state.nearest_enemy.distance == 0.05

    def test_nearest_enemy_none_when_no_visible(self):
        e = self._enemy(visible=False)
        state = _base_state(enemies=[e])
        assert state.nearest_enemy is None

    def test_available_jungle_camps(self):
        ready = JungleCamp(camp_id="red_buff", position=Position(x=0.3, y=0.3), respawn_in=0)
        not_ready = JungleCamp(camp_id="blue_buff", position=Position(x=0.7, y=0.3), respawn_in=30)
        invaded = JungleCamp(
            camp_id="crab", position=Position(x=0.5, y=0.7), respawn_in=0, is_invaded=True
        )
        state = _base_state(jungle_camps=[ready, not_ready, invaded])
        available = state.available_jungle_camps
        assert len(available) == 1
        assert available[0].camp_id == "red_buff"

    def test_skills_ready_true(self):
        state = _base_state(skill_cooldowns=SkillCooldowns(skill_1=0.0, skill_2=0.0, ultimate=10.0))
        assert state.skills_ready is True

    def test_skills_ready_false_when_s1_on_cd(self):
        state = _base_state(skill_cooldowns=SkillCooldowns(skill_1=3.0, skill_2=0.0))
        assert state.skills_ready is False

    def test_ultimate_ready(self):
        state = _base_state(skill_cooldowns=SkillCooldowns(ultimate=0.0))
        assert state.ultimate_ready is True

    def test_ultimate_not_ready(self):
        state = _base_state(skill_cooldowns=SkillCooldowns(ultimate=20.0))
        assert state.ultimate_ready is False


class TestValidation:
    def test_hp_pct_clamp(self):
        with pytest.raises(Exception):
            _base_state(hp_pct=1.5)

    def test_energy_clamp(self):
        with pytest.raises(Exception):
            _base_state(energy=110.0)

    def test_shadow_count_clamp(self):
        with pytest.raises(Exception):
            _base_state(active_shadow_count=4)
