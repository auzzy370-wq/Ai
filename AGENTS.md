# AGENTS.md

Guidance for AI agents working in this repository.

## Project overview

**Ai** is a minimal FastAPI service that exposes a health check and a chat endpoint. Without `OPENAI_API_KEY`, `/api/chat` returns deterministic mock replies so the app is runnable in any environment.

## Cursor Cloud specific instructions

### Services

| Service | Command | Port |
|---------|---------|------|
| API (required) | `uvicorn ai_app.main:app --reload --host 0.0.0.0 --port 8000` | 8000 |

Run from `/workspace` with the virtualenv activated and `PYTHONPATH=src` or after `pip install -e .`.

### Dependency refresh

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pip install -e .
```

The VM update script runs `pip install -r requirements-dev.txt` and `pip install -e .` when `.venv` already exists; on first boot, create the venv manually or let the agent do it once.

### Lint / test / run

```bash
source .venv/bin/activate
ruff check .
pytest
uvicorn ai_app.main:app --host 0.0.0.0 --port 8000
```

### Notes

- Mock mode is the default; no secrets are required for basic chat demos.
- OpenAI integration is optional (`pip install openai` + `OPENAI_API_KEY`).
- API docs: http://localhost:8000/docs
