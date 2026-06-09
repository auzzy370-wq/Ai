from fastapi.testclient import TestClient

from ai_app.config import reset_config_cache
from ai_app.main import app


def test_forced_mock_mode_overrides_api_key(monkeypatch) -> None:
    monkeypatch.setenv("MOCK_MODE", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-key")
    reset_config_cache()

    with TestClient(app) as test_client:
        status = test_client.get("/api/status").json()
        assert status["mode"] == "mock"
        assert status["mock_forced"] is True
        assert status["reason"] == "forced"

        chat = test_client.post("/api/chat", json={"message": "Stay in mock"}).json()
        assert chat["model"] == "mock"
        assert "Mock AI" in chat["reply"]


def test_mock_mode_env_values(monkeypatch) -> None:
    for value in ("1", "yes", "on", "TRUE"):
        monkeypatch.setenv("MOCK_MODE", value)
        reset_config_cache()
        from ai_app.config import is_mock_mode_forced

        assert is_mock_mode_forced() is True
