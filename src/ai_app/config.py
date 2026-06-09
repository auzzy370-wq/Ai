import os
from functools import lru_cache


@lru_cache
def get_openai_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


@lru_cache
def get_system_prompt() -> str | None:
    value = os.getenv("SYSTEM_PROMPT", "").strip()
    return value or None


@lru_cache
def get_cors_origins() -> tuple[str, ...]:
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if not raw:
        return ()
    if raw == "*":
        return ("*",)
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


def reset_config_cache() -> None:
    get_openai_model.cache_clear()
    get_system_prompt.cache_clear()
    get_cors_origins.cache_clear()
