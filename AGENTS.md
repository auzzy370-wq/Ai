# AGENTS.md

Guidance for AI agents working in this repository.

## Project overview

**Ai** is a minimal FastAPI service with a built-in web chat UI (`/`), a health check (`/health`), and a chat API (`/api/chat`). Without `OPENAI_API_KEY`, `/api/chat` returns deterministic mock replies so the app is runnable in any environment.

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

The VM update script creates `.venv` (if missing), installs dev dependencies, and installs the package in editable mode.

**Gotcha:** Ubuntu Cloud Agent images may not include `python3.12-venv` by default. If `python3 -m venv .venv` fails, run once: `sudo apt-get install -y python3.12-venv`.

### Lint / test / run

```bash
make install   # first time only
make lint
make test
make dev       # API with reload on port 8000
```

Equivalent manual commands:

```bash
source .venv/bin/activate
ruff check .
pytest
uvicorn ai_app.main:app --host 0.0.0.0 --port 8000
```

### Notes

- Mock mode is the default; no secrets are required for basic chat demos.
- OpenAI integration is optional (`pip install openai` + `OPENAI_API_KEY`).
- Chat UI: http://localhost:8000
- API docs: http://localhost:8000/docs
- Docker: `make docker-up` (requires Docker)
