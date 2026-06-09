from ai_app.cli import _iter_stream_events, chat


class FakeResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class FakeStreamResponse:
    def __init__(self, body: str) -> None:
        self._body = body

    def raise_for_status(self) -> None:
        return None

    def iter_text(self):
        yield self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FakeClient:
    def __init__(self, mode: str = "json") -> None:
        self.mode = mode

    def post(self, path: str, json: dict):
        assert path == "/api/chat"
        message = json["message"]
        return FakeResponse(
            {"reply": f"Mock AI: You said '{message}'.", "model": "mock"},
        )

    def stream(self, method: str, path: str, json: dict):
        assert method == "POST" and path == "/api/chat/stream"
        body = (
            'data: {"token": "Mock "}\n\n'
            'data: {"token": "AI "}\n\n'
            'data: {"done": true, "model": "mock"}\n\n'
        )
        return FakeStreamResponse(body)

    def close(self) -> None:
        return None


def test_cli_chat_against_app() -> None:
    reply, model = chat("http://testserver", "CLI hello", stream=False, client=FakeClient())
    assert model == "mock"
    assert "CLI hello" in reply


def test_cli_stream_against_app(capsys) -> None:
    reply, model = chat("http://testserver", "Stream hello", stream=True, client=FakeClient())
    captured = capsys.readouterr()
    assert model == "mock"
    assert "Mock AI" in reply
    assert "Mock " in captured.out


def test_iter_stream_events() -> None:
    body = 'data: {"token": "hi"}\n\ndata: {"done": true, "model": "mock"}\n\n'
    events = list(_iter_stream_events(FakeStreamResponse(body)))
    assert events[0]["token"] == "hi"
    assert events[1]["done"] is True
