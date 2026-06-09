import os
from collections.abc import Iterator

from ai_app.config import get_openai_model, get_system_prompt
from ai_app.models import ChatMessage


def _build_messages(history: list[ChatMessage], message: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    system_prompt = get_system_prompt()
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    messages.extend({"role": item.role, "content": item.content} for item in history)
    messages.append({"role": "user", "content": message})
    return messages


def _mock_reply(message: str, history: list[ChatMessage]) -> str:
    turn = len(history) // 2 + 1
    if history:
        last_assistant = next(
            (item.content for item in reversed(history) if item.role == "assistant"),
            None,
        )
        if last_assistant:
            return (
                f"Mock AI (turn {turn}): You said '{message}'. "
                f"I'm still in mock mode — my last reply started with "
                f"\"{last_assistant[:40]}{'...' if len(last_assistant) > 40 else ''}\". "
                "Set OPENAI_API_KEY for live multi-turn chat."
            )

    return f"Mock AI: You said '{message}'. Set OPENAI_API_KEY for live responses."


def get_runtime_mode() -> tuple[str, str]:
    api_key = os.getenv("OPENAI_API_KEY")
    model = get_openai_model()
    if not api_key:
        return "mock", "mock"

    try:
        import openai  # noqa: F401
    except ImportError:
        return "mock", "mock (openai package missing)"

    return "openai", model


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
