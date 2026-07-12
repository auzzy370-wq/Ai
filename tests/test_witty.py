"""Tests for the WitBot witty response engine."""

import pytest

from ai_app.models import ChatMessage
from ai_app.responder import WITTY_SYSTEM_PROMPT, _mock_reply


def _user(content: str) -> ChatMessage:
    return ChatMessage(role="user", content=content)


def _assistant(content: str) -> ChatMessage:
    return ChatMessage(role="assistant", content=content)


def test_witty_reply_is_not_empty() -> None:
    reply = _mock_reply("Hello!", [])
    assert reply and len(reply) > 5


def test_witty_greeting_response() -> None:
    for greeting in ("hello", "hi", "hey", "howdy"):
        reply = _mock_reply(greeting, [])
        assert len(reply) > 10


def test_witty_how_are_you_response() -> None:
    reply = _mock_reply("How are you doing?", [])
    assert len(reply) > 10


def test_witty_question_response() -> None:
    reply = _mock_reply("What is the meaning of life?", [])
    assert len(reply) > 10


def test_witty_help_response() -> None:
    reply = _mock_reply("help", [])
    assert "mock mode" in reply.lower() or "witty" in reply.lower()


def test_witty_name_recall_with_name() -> None:
    history = [
        _user("My name is Jordan"),
        _assistant("Nice to meet you, Jordan!"),
    ]
    reply = _mock_reply("What's my name?", history)
    assert "jordan" in reply.lower()


def test_witty_name_recall_without_name() -> None:
    reply = _mock_reply("What's my name?", [])
    assert "don't have your name" in reply.lower()


def test_witty_determinism() -> None:
    """Same inputs produce the same reply every time."""
    r1 = _mock_reply("Surprise me", [])
    r2 = _mock_reply("Surprise me", [])
    assert r1 == r2


def test_witty_varies_with_history_length() -> None:
    """Adding history shifts the seed, possibly changing the reply bucket."""
    reply_no_history = _mock_reply("Tell me something", [])
    history = [_user("Hi"), _assistant("Hey there!")]
    reply_with_history = _mock_reply("Tell me something", history)
    # They may or may not differ (depends on hash), but both should be non-empty
    assert len(reply_no_history) > 5
    assert len(reply_with_history) > 5


def test_witty_never_echoes_verbatim() -> None:
    """WitBot should not literally echo 'Mock AI: You said...' anymore."""
    for msg in ("Hello", "What time is it?", "I love pizza", "test"):
        reply = _mock_reply(msg, [])
        assert "Mock AI: You said" not in reply


def test_witty_system_prompt_is_set() -> None:
    assert "WitBot" in WITTY_SYSTEM_PROMPT
    assert len(WITTY_SYSTEM_PROMPT) > 50


@pytest.mark.parametrize(
    "message",
    [
        "Why is the sky blue?",
        "Can you help me?",
        "Who are you?",
        "Do you have feelings?",
        "What do you think about that?",
    ],
)
def test_witty_question_variants(message: str) -> None:
    reply = _mock_reply(message, [])
    assert len(reply) > 10
