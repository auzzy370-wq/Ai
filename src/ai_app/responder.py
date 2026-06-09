import os


def generate_reply(message: str) -> tuple[str, str]:
    """Return a chat reply and model name.

    Uses OpenAI when OPENAI_API_KEY is set; otherwise returns a deterministic mock reply
    so the app runs without external credentials.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            from openai import OpenAI  # type: ignore[import-not-found]
        except ImportError:
            return (
                "OPENAI_API_KEY is set but the openai package is not installed. "
                "Install with: pip install openai",
                "mock",
            )

        try:
            client = OpenAI(api_key=api_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": message}],
            )
            reply = completion.choices[0].message.content or ""
            return reply.strip(), "gpt-4o-mini"
        except Exception:
            # Fall back to mock mode if the provider call fails.
            pass

    return f"Mock AI: You said '{message}'. Set OPENAI_API_KEY for live responses.", "mock"
