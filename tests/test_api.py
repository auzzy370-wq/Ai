from fastapi.testclient import TestClient

from ai_app.main import app

client = TestClient(app)


def test_index_ui() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Ai Chat" in response.text


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_status_mock_mode() -> None:
    response = client.get("/api/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "mock"
    assert payload["model"] == "mock"


def test_chat_mock_reply() -> None:
    response = client.post("/api/chat", json={"message": "Hello, Ai!"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "mock"
    assert "Hello, Ai!" in payload["reply"]


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
    assert payload["model"] == "mock"
    assert "turn 2" in payload["reply"].lower()
