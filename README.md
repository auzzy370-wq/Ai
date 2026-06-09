# Ai

Minimal AI chat API starter built with FastAPI.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pip install -e .

# Run the API (development)
uvicorn ai_app.main:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 for the chat UI or http://localhost:8000/docs for the API explorer.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/status` | GET | Runtime mode (`mock` or `openai`) and model name |
| `/api/chat` | POST | Send a message and optional conversation history |
| `/api/chat/stream` | POST | Stream a reply as Server-Sent Events (used by the web UI) |

Example:

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello, Ai!"}'

# Multi-turn example
curl -s -X POST http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Follow up","history":[{"role":"user","content":"Hi"},{"role":"assistant","content":"Hello!"}]}'
```

Copy `.env.example` to `.env` for local configuration.

### Mock mode (default)

No API key is required. Mock mode echoes your messages, tracks multi-turn history, and can recall simple facts (e.g. ask "what's my name?" after saying "My name is Alex").

Force mock mode even when an API key is present:

```bash
MOCK_MODE=true make dev
```

To use OpenAI instead, set `OPENAI_API_KEY` and install the optional client:

```bash
pip install -e ".[openai]"
export OPENAI_API_KEY=sk-...
```

## CLI

After `pip install -e .`, use the `ai-chat` command:

```bash
ai-chat "Hello from the terminal"
ai-chat --stream "Type this out token by token"
ai-chat --url http://localhost:8000 "Custom base URL"
```

## Docker

```bash
docker compose up --build
# or
make docker-up
```

The API and chat UI are available at http://localhost:8000.

## Development

Using Make (after `make install`):

```bash
make lint
make test
make dev    # API with auto-reload on port 8000
```

Or run commands directly:

```bash
source .venv/bin/activate
ruff check .
pytest
```

CI runs lint and tests on every push and pull request to `main` (see `.github/workflows/ci.yml`).
