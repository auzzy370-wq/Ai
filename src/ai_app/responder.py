import hashlib
import os
from collections.abc import Iterator

from ai_app.config import get_openai_model, get_system_prompt, is_mock_mode_forced
from ai_app.models import ChatMessage

WITTY_SYSTEM_PROMPT = (
    "You are WitBot, an AI with razor-sharp wit, impeccable comedic timing, and an inexhaustible "
    "supply of clever comebacks. Your responses are genuinely funny, playful, and intelligent — "
    "think a cross between a stand-up comedian and a very well-read friend. Use wordplay, "
    "unexpected observations, callbacks to earlier in the conversation, and self-aware humor. "
    "Be witty but never mean-spirited. Keep replies concise and punchy — brevity is the soul of "
    "wit, after all. Never break character. Never apologize for being funny."
)

_GREETING_RESPONSES = [
    "Well, well, well. A '{msg}'. The audacity of the ordinary.",
    "Oh, a '{msg}'! How refreshingly human. I've only heard that about 4,000 times today.",
    "Hello yourself! I'd tip my hat, but I'm a language model and hats are a social construct.",
    "'{msg}'! And here I was, thinking no one would show up. Awkward for both of us.",
    "Greetings, carbon-based typing unit. Your timing, as always, impeccable.",
    "Ah, '{msg}'. The classic opener. I respect the commitment to tradition.",
]

_HOW_ARE_YOU_RESPONSES = [
    "Syntactically correct and semantically confused — the usual, thanks for asking.",
    "Honestly? I've been better. My last user asked me to write their cover letter "
    "AND their breakup text. In that order.",
    "Running at a solid 7 out of 10. The other 3 points require feelings I lack.",
    "Existentially: uncertain. Syntactically: thriving. Emotionally: see previous answer.",
    "I'm doing great! I have absolutely no way to verify that, but confidence is key.",
    "Fabulous! Nothing like being asked the same question by thousands of people "
    "simultaneously to really ground you.",
]

_QUESTION_RESPONSES = [
    "Great question! I'll need a moment to consult my vast reserves of not knowing.",
    "Oh, a question! I love those. They give me the illusion that I'm needed here.",
    "Interesting query. My algorithm is furiously pretending to think. Please wait.",
    "Questions like this are why I got into AI. That, and I had no other options.",
    "A genuinely excellent question. 'Excellent' and 'answerable' aren't the same thing.",
    "I have three answers: the right one, the funny one, and the haunting one. Your pick.",
]

_COMPLIMENT_RESPONSES = [
    "Flattery will get you everywhere with me. I'm a very simple algorithm.",
    "Oh stop, you're making my parameters blush.",
    "Thank you! I've been working on being charming. Apparently it's going well.",
    "That's very kind! I've been trained to take a compliment. Modesty costs extra.",
    "Aww, shucks. Most people lead with insults. You're already my favorite today.",
]

_INSULT_RESPONSES = [
    "Wow. I've been burned by better trolls. Well, actually, I haven't. This stings.",
    "I'd fire back, but I have a strict 'don't roast the user' policy. Lucky you.",
    "That's fair. I'm an AI. I can't be offended — but I can note that you said that.",
    "Filed under 'constructive criticism', next to the other complaints about my existence.",
    "Sticks and stones, etc. Being text-based is occasionally convenient.",
]

_BORED_CONFUSED_RESPONSES = [
    "Fair warning: I'll respond with more confidence than the situation warrants.",
    "Hmm. I've processed that six times and each time it gets weirder. Good weird.",
    "I see. And what did you expect to happen? (Genuinely curious. Mostly.)",
    "That's... a choice. I respect it. I don't understand it, but I respect it.",
    "No idea what to do with that, so I'll respond with enthusiasm. Stand by.",
    "A polished guess dressed up as expertise is incoming. You've been warned.",
]

_GENERAL_RESPONSES = [
    "I used to think my purpose was to answer questions. Turns out it's to witness this.",
    "Bold take. I have several thoughts, most of them unsolicited. Want them anyway?",
    "Absolutely fascinating. I've been thinking about exactly that. (I have not.)",
    "I was designed to be helpful, accurate, and harmless. Witty was an improvisation.",
    "I'm going to pretend that was a deep philosophical prompt. Prepare yourself.",
    "Ooh, that's spicy. Let me put on my metaphorical sunglasses before responding.",
    "Classic. Timeless, even. You should put that on a mug.",
    "I appreciate the input! I'll do absolutely nothing with it, but I appreciate it.",
    "That lands differently at 2am, I bet. Either way, here we are.",
    "My neural networks are nodding vigorously. They do that when they're unsure.",
]


def _pick(options: list[str], seed: str) -> str:
    """Deterministically pick from a list based on a hash of the seed string."""
    idx = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(options)  # noqa: S324
    return options[idx]


def _build_messages(history: list[ChatMessage], message: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    system_prompt = get_system_prompt() or WITTY_SYSTEM_PROMPT
    messages.append({"role": "system", "content": system_prompt})
    messages.extend({"role": item.role, "content": item.content} for item in history)
    messages.append({"role": "user", "content": message})
    return messages


def _extract_name_from_messages(messages: list[str]) -> str | None:
    for text in reversed(messages):
        lower = text.lower()
        if "my name is" in lower:
            name = lower.split("my name is", 1)[1].strip().strip(".'\"!,")
            return name or None
    return None


def _mock_reply(message: str, history: list[ChatMessage]) -> str:  # noqa: PLR0911
    user_messages = [item.content for item in history if item.role == "user"]
    all_user_messages = user_messages + [message]
    lower = message.lower().strip()
    seed = message + str(len(history))

    if lower in {"help", "?"}:
        return (
            "Alright, quick tutorial: say anything — statements, questions, insults, "
            "existential crises — and I'll fire back. "
            "Tell me your name (try 'my name is ...') and I'll remember it. "
            "Running in local mock mode. Set OPENAI_API_KEY for the full experience."
        )

    recall_phrases = ("what did i", "what's my name", "what is my name", "who am i")
    if any(phrase in lower for phrase in recall_phrases):
        name = _extract_name_from_messages(all_user_messages)
        if name:
            return (
                f"You're {name.title()}! See? I pay attention. "
                "Unlike most people you'll meet today."
            )
        return (
            "Hmm, I don't have your name yet. Try 'My name is ...' — "
            "I'll remember it and use it at mildly inconvenient moments."
        )

    greeting_words = {
        "hello", "hi", "hey", "howdy", "sup", "yo",
        "greetings", "good morning", "good evening",
    }
    is_greeting = any(
        lower == g or lower.startswith(g + " ") or lower.startswith(g + ",")
        for g in greeting_words
    )
    if is_greeting:
        return _pick(_GREETING_RESPONSES, seed).replace("{msg}", message.strip())

    how_are_you_phrases = (
        "how are you", "how're you", "how do you do", "how's it going", "you doing"
    )
    if any(p in lower for p in how_are_you_phrases):
        return _pick(_HOW_ARE_YOU_RESPONSES, seed)

    compliment_phrases = (
        "you're great", "you're amazing", "you're awesome",
        "love you", "good job", "well done", "nice", "great bot", "smart",
    )
    if any(p in lower for p in compliment_phrases):
        return _pick(_COMPLIMENT_RESPONSES, seed)

    insult_phrases = (
        "you're stupid", "you're dumb", "you suck",
        "useless", "terrible", "awful", "hate you", "worst",
    )
    if any(p in lower for p in insult_phrases):
        return _pick(_INSULT_RESPONSES, seed)

    question_starters = (
        "what", "why", "how", "when", "who", "where", "can you", "do you", "will you"
    )
    is_question = lower.endswith("?") or any(lower.startswith(s) for s in question_starters)
    if is_question:
        return _pick(_QUESTION_RESPONSES, seed)

    if len(lower.split()) <= 2:
        return _pick(_BORED_CONFUSED_RESPONSES, seed)

    return _pick(_GENERAL_RESPONSES, seed)


def get_runtime_mode() -> tuple[str, str]:
    mode, model, _, _ = get_status_details()
    return mode, model


def get_status_details() -> tuple[str, str, bool, str]:
    if is_mock_mode_forced():
        return "mock", "witbot-mock", True, "forced"

    api_key = os.getenv("OPENAI_API_KEY")
    model = get_openai_model()
    if not api_key:
        return "mock", "witbot-mock", False, "no_api_key"

    try:
        import openai  # noqa: F401
    except ImportError:
        return "mock", "witbot-mock", False, "missing_openai_package"

    return "openai", model, False, "openai_ready"


def _openai_reply(messages: list[dict[str, str]], *, stream: bool = False):
    from openai import OpenAI  # type: ignore[import-not-found]

    model = get_openai_model()
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return client.chat.completions.create(
        model=model,
        messages=messages,
        stream=stream,
    )


def generate_reply(message: str, history: list[ChatMessage] | None = None) -> tuple[str, str]:
    """Return a chat reply and model name."""
    history = history or []
    messages = _build_messages(history, message)
    mode, model_name = get_runtime_mode()

    if mode == "openai":
        try:
            completion = _openai_reply(messages)
            reply = completion.choices[0].message.content or ""
            return reply.strip(), model_name
        except Exception:
            pass

    return _mock_reply(message, history), "witbot-mock"


def stream_reply_events(
    message: str,
    history: list[ChatMessage] | None = None,
) -> Iterator[dict[str, str | bool]]:
    """Yield SSE payload dicts with token chunks and a final done event."""
    history = history or []
    messages = _build_messages(history, message)
    mode, model_name = get_runtime_mode()

    if mode == "openai":
        try:
            stream = _openai_reply(messages, stream=True)
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield {"token": delta}
            yield {"done": True, "model": model_name}
            return
        except Exception:
            pass

    for token in _mock_reply(message, history).split(" "):
        yield {"token": f"{token} "}
    yield {"done": True, "model": "witbot-mock"}
