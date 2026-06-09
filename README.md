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
| `/api/chat` | POST | Send a message and receive a reply |

Example:

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello, Ai!"}'
```

By default the app uses a built-in mock responder so it runs without API keys. To use OpenAI, set `OPENAI_API_KEY` and install the optional client:

```bash
pip install -e ".[openai]"
export OPENAI_API_KEY=sk-...
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
