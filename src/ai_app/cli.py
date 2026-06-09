"""Terminal client for the Ai chat API."""

from __future__ import annotations

import argparse
import json
import sys
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from collections.abc import Iterator


def _iter_stream_events(response: httpx.Response) -> Iterator[dict]:
    buffer = ""
    for chunk in response.iter_text():
        buffer += chunk
        parts = buffer.split("\n\n")
        buffer = parts.pop() or ""
        for part in parts:
            line = part.strip()
            if line.startswith("data: "):
                yield json.loads(line[6:])


def chat(
    base_url: str,
    message: str,
    *,
    stream: bool = False,
    client: httpx.Client | None = None,
) -> tuple[str, str]:
    payload = {"message": message}
    owns_client = client is None
    http = client or httpx.Client(base_url=base_url.rstrip("/"), timeout=60.0)

    try:
        if not stream:
            response = http.post("/api/chat", json=payload)
            response.raise_for_status()
            data = response.json()
            return data["reply"], data["model"]

        reply_parts: list[str] = []
        model = "mock"

        with http.stream("POST", "/api/chat/stream", json=payload) as response:
            response.raise_for_status()
            for event in _iter_stream_events(response):
                token = event.get("token")
                if token:
                    reply_parts.append(str(token))
                    print(token, end="", flush=True)
                if event.get("done"):
                    model = str(event.get("model", model))

        print()
        return "".join(reply_parts).strip(), model
    finally:
        if owns_client:
            http.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Send a message to the Ai chat API")
    parser.add_argument("message", help="User message")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL for the Ai API (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--stream",
        action="store_true",
        help="Stream the response token-by-token",
    )
    args = parser.parse_args()

    try:
        reply, model = chat(args.url, args.message, stream=args.stream)
    except httpx.HTTPError as error:
        print(f"Request failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    if not args.stream:
        print(reply)
    print(f"[model: {model}]", file=sys.stderr)


if __name__ == "__main__":
    main()
