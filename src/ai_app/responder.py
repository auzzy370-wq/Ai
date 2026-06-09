import os
from collections.abc import Iterator

from ai_app.config import get_openai_model, get_system_prompt, is_mock_mode_forced
from ai_app.models import ChatMessage


def _build_messages(history: list[ChatMessage], message: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    system_prompt = get_system_prompt()
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    messages.extend({"role": item.role, "content": item.content} for item in history)
    messages.append({"role": "user", "content": message})
    return messages


def _extract_name_from_messages(messages: list[str]) -> str | None:
    for text in reversed(messages):
        lower = text.lower()
        if "my name is" in lower:
            name = lower.split("my name is", 1)[1].strip().strip(".'\"")
            return name or None
    return None


def _mock_reply(message: str, history: list[ChatMessage]) -> str:
    user_messages = [item.content for item in history if item.role == "user"]
    all_user_messages = user_messages + [message]
    lower = message.lower().strip()
    turn = len(history) // 2 + 1

    if lower in {"help", "?"}:
        return (
            "Mock AI: Local mock mode is active. "
            "Try multi-turn chat, ask \"what's my name\" after introducing yourself, "
            "or set OPENAI_API_KEY for live AI."
        )

    recall_phrases = ("what did i", "what's my name", "what is my name", "who am i")
    if any(phrase in lower for phrase in recall_phrases):
        name = _extract_name_from_messages(all_user_messages)
        if name:
            return f"Mock AI: You said your name is {name.title()}."
        return 'Mock AI: I do not have your name yet. Try saying "My name is ...".'

    system_prompt = get_system_prompt()
    if system_prompt:
        preview = system_prompt if len(system_prompt) <= 80 else f"{system_prompt[:80]}..."
        return (
            f"Mock AI (turn {turn}): You said '{message}'. "
            f'[System prompt: "{preview}"]'
        )

    if history:
        return (
            f"Mock AI (turn {turn}): You said '{message}'. "
            "Conversation history is tracked in mock mode."
        )

    return f"Mock AI: You said '{message}'. Running in mock mode (no API key needed)."


def get_runtime_mode() -> tuple[str, str]:
    mode, model, _, _ = get_status_details()
    return mode, model


def get_status_details() -> tuple[str, str, bool, str]:
    if is_mock_mode_forced():
        return "mock", "mock", True, "forced"

    api_key = os.getenv("OPENAI_API_KEY")
    model = get_openai_model()
    if not api_key:
        return "mock", "mock", False, "no_api_key"

    try:
        import openai  # noqa: F401
    except ImportError:
        return "mock", "mock", False, "missing_openai_package"

    return "openai", model, False, "openai_ready"


def _openai_reply(messages: list[dict[str, str]], *, stream: bool = False):
    from openai import OpenAI  # type: ignore[import-not-found]

    model = get_openai_model()
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return client.chat.completions.create(
        model=model,
        messages=messages,
        stream=stream,
    )


def generate_reply(message: str, history: list[ChatMessage] | None = None) -> tuple[str, str]:
    """Return a chat reply and model name."""
    history = history or []
    messages = _build_messages(history, message)
    mode, model_name = get_runtime_mode()

    if mode == "openai":
        try:
            completion = _openai_reply(messages)
            reply = completion.choices[0].message.content or ""
            return reply.strip(), model_name
        except Exception:
            pass

    return _mock_reply(message, history), "mock"


def stream_reply_events(
    message: str,
    history: list[ChatMessage] | None = None,
) -> Iterator[dict[str, str | bool]]:
    """Yield SSE payload dicts with token chunks and a final done event."""
    history = history or []
    messages = _build_messages(history, message)
    mode, model_name = get_runtime_mode()

    if mode == "openai":
        try:
            stream = _openai_reply(messages, stream=True)
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield {"token": delta}
            yield {"done": True, "model": model_name}
            return
        except Exception:
            pass

    for token in _mock_reply(message, history).split(" "):
        yield {"token": f"{token} "}
    yield {"done": True, "model": "mock"}
