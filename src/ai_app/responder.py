import os
from collections.abc import Iterator

from ai_app.models import ChatMessage

OPENAI_MODEL = "gpt-4o-mini"


def _build_messages(history: list[ChatMessage], message: str) -> list[dict[str, str]]:
    messages = [{"role": item.role, "content": item.content} for item in history]
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

    return (
        f"Mock AI: You said '{message}'. Set OPENAI_API_KEY for live responses."
    )


def get_runtime_mode() -> tuple[str, str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "mock", "mock"

    try:
        import openai  # noqa: F401
    except ImportError:
        return "mock", "mock (openai package missing)"

    return "openai", OPENAI_MODEL


def generate_reply(message: str, history: list[ChatMessage] | None = None) -> tuple[str, str]:
    """Return a chat reply and model name."""
    history = history or []
    messages = _build_messages(history, message)
    mode, model_name = get_runtime_mode()

    if mode == "openai":
        try:
            from openai import OpenAI  # type: ignore[import-not-found]

            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            completion = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
            )
            reply = completion.choices[0].message.content or ""
            return reply.strip(), OPENAI_MODEL
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
    mode, _ = get_runtime_mode()

    if mode == "openai":
        try:
            from openai import OpenAI  # type: ignore[import-not-found]

            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            stream = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield {"token": delta}
            yield {"done": True, "model": OPENAI_MODEL}
            return
        except Exception:
            pass

    for token in _mock_reply(message, history).split(" "):
        yield {"token": f"{token} "}
    yield {"done": True, "model": "mock"}
