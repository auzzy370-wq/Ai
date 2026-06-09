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


def test_chat_mock_reply() -> None:
    response = client.post("/api/chat", json={"message": "Hello, Ai!"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "mock"
    assert "Hello, Ai!" in payload["reply"]
