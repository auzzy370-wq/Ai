from ai_app.config import get_cors_origins, get_openai_model, get_system_prompt, reset_config_cache


def test_openai_model_default(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_MODEL", raising=False)
    reset_config_cache()
    assert get_openai_model() == "gpt-4o-mini"


def test_system_prompt_empty_by_default(monkeypatch) -> None:
    monkeypatch.delenv("SYSTEM_PROMPT", raising=False)
    reset_config_cache()
    assert get_system_prompt() is None


def test_cors_origins_parsing(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://a.test, http://b.test")
    reset_config_cache()
    assert get_cors_origins() == ("http://a.test", "http://b.test")
