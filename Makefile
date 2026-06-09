.PHONY: install lint test run dev chat docker-up docker-down clean

install:
	python3 -m venv .venv
	.venv/bin/pip install -r requirements-dev.txt
	.venv/bin/pip install -e .

lint:
	.venv/bin/ruff check .

test:
	.venv/bin/pytest -v

run:
	.venv/bin/uvicorn ai_app.main:app --host 0.0.0.0 --port 8000

dev:
	.venv/bin/uvicorn ai_app.main:app --reload --host 0.0.0.0 --port 8000

chat:
	.venv/bin/ai-chat "$(MSG)"

docker-up:
	docker compose up --build

docker-down:
	docker compose down

clean:
	rm -rf .venv .pytest_cache .ruff_cache src/*.egg-info
