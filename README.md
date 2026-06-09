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

Open http://localhost:8000/docs for the interactive API explorer.

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
pip install openai
export OPENAI_API_KEY=sk-...
```

## Development

```bash
# Lint
ruff check .

# Tests
pytest
```
