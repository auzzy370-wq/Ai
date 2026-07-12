from fastapi.testclient import TestClient

from ai_app.main import app

client = TestClient(app)


def test_index_ui() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "WitBot" in response.text


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_status_mock_mode() -> None:
    response = client.get("/api/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "mock"
    assert payload["model"] == "witbot-mock"
    assert payload["mock_forced"] is False
    assert payload["reason"] == "no_api_key"


def test_chat_witty_reply() -> None:
    response = client.post("/api/chat", json={"message": "Hello there!"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "witbot-mock"
    assert len(payload["reply"]) > 0
    # Witty replies never just echo the message back with "Mock AI: You said..."
    assert "Mock AI: You said" not in payload["reply"]


def test_chat_greeting_reply() -> None:
    response = client.post("/api/chat", json={"message": "Hey"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "witbot-mock"
    assert len(payload["reply"]) > 10


def test_chat_question_reply() -> None:
    response = client.post("/api/chat", json={"message": "What is the meaning of life?"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "witbot-mock"
    assert len(payload["reply"]) > 10


def test_chat_stream_mock_reply() -> None:
    with client.stream(
        "POST",
        "/api/chat/stream",
        json={"message": "Tell me something funny"},
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        body = "".join(response.iter_text())

    assert '"done": true' in body or '"done":true' in body
    assert "witbot-mock" in body


def test_chat_multi_turn_history() -> None:
    first = client.post("/api/chat", json={"message": "My name is Alex"})
    assert first.status_code == 200
    first_reply = first.json()["reply"]

    second = client.post(
        "/api/chat",
        json={
            "message": "What did I just tell you?",
            "history": [
                {"role": "user", "content": "My name is Alex"},
                {"role": "assistant", "content": first_reply},
            ],
        },
    )
    assert second.status_code == 200
    payload = second.json()
    assert payload["model"] == "witbot-mock"
    assert "alex" in payload["reply"].lower()


def test_mock_recall_without_name() -> None:
    response = client.post("/api/chat", json={"message": "What's my name?"})
    assert response.status_code == 200
    assert "don't have your name" in response.json()["reply"].lower()


def test_mock_help_command() -> None:
    response = client.post("/api/chat", json={"message": "help"})
    assert response.status_code == 200
    reply = response.json()["reply"].lower()
    assert "mock mode" in reply or "witty" in reply or "openai" in reply


def test_witty_determinism() -> None:
    """Same message + history length should always produce the same witty reply."""
    r1 = client.post("/api/chat", json={"message": "Surprise me"})
    r2 = client.post("/api/chat", json={"message": "Surprise me"})
    assert r1.json()["reply"] == r2.json()["reply"]
