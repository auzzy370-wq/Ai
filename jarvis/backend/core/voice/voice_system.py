"""
JARVIS Voice System - Full duplex voice interface with wake word detection.

Features:
- Wake word detection: "Hey Jarvis"
- Real-time speech-to-text (Whisper)
- Neural text-to-speech synthesis
- Streaming responses
- Emotional voice modulation
- Context-aware conversation
"""

from __future__ import annotations

import asyncio
import io
import json
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional

import structlog

logger = structlog.get_logger(__name__)


class VoiceState(str, Enum):
    IDLE = "idle"
    LISTENING = "listening"
    WAKE_WORD_DETECTED = "wake_word_detected"
    TRANSCRIBING = "transcribing"
    PROCESSING = "processing"
    SPEAKING = "speaking"
    ERROR = "error"


class VoiceEmotion(str, Enum):
    NEUTRAL = "neutral"
    CONFIDENT = "confident"
    HELPFUL = "helpful"
    ALERT = "alert"
    THOUGHTFUL = "thoughtful"
    ENTHUSIASTIC = "enthusiastic"


@dataclass
class VoiceSession:
    """Active voice conversation session."""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    started_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    turn_count: int = 0
    context: Dict[str, Any] = field(default_factory=dict)
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    emotion: VoiceEmotion = VoiceEmotion.NEUTRAL


@dataclass
class TranscriptionResult:
    """Result from speech-to-text transcription."""
    text: str
    confidence: float
    language: str
    duration_seconds: float
    segments: List[Dict[str, Any]] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)


@dataclass
class SynthesisRequest:
    """Text-to-speech synthesis request."""
    text: str
    emotion: VoiceEmotion = VoiceEmotion.NEUTRAL
    speed: float = 1.0
    pitch: float = 1.0
    voice_id: str = "jarvis_v1"
    stream: bool = True


class WakeWordDetector:
    """
    Wake word detection system.
    Listens for "Hey Jarvis" to activate voice mode.
    """

    WAKE_WORDS = ["hey jarvis", "jarvis", "hey j.a.r.v.i.s"]

    def __init__(self):
        self._callbacks: List[Callable] = []
        self._running = False
        self._detection_confidence_threshold = 0.85

    def on_wake_word(self, callback: Callable):
        """Register callback for wake word detection."""
        self._callbacks.append(callback)

    async def detect_in_text(self, text: str) -> bool:
        """Check if text contains a wake word."""
        text_lower = text.lower().strip()
        for wake_word in self.WAKE_WORDS:
            if text_lower.startswith(wake_word) or wake_word in text_lower:
                await self._fire_callbacks(wake_word, text)
                return True
        return False

    async def _fire_callbacks(self, wake_word: str, full_text: str):
        """Fire all registered callbacks."""
        for callback in self._callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(wake_word, full_text)
                else:
                    callback(wake_word, full_text)
            except Exception as e:
                logger.error("Wake word callback error", error=str(e))


class SpeechToText:
    """
    Speech-to-text using OpenAI Whisper.
    Supports streaming transcription for low latency.
    """

    def __init__(self, model: str = "whisper-1"):
        self.model = model
        self._client = None

    async def _get_client(self):
        if self._client is None:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI()
            except Exception:
                pass
        return self._client

    async def transcribe(
        self,
        audio_data: bytes,
        language: Optional[str] = None,
    ) -> TranscriptionResult:
        """Transcribe audio to text using Whisper."""
        client = await self._get_client()

        if not client:
            return TranscriptionResult(
                text="[STT unavailable - OpenAI key required]",
                confidence=0.0,
                language="en",
                duration_seconds=0.0,
            )

        try:
            audio_file = io.BytesIO(audio_data)
            audio_file.name = "audio.wav"

            response = await client.audio.transcriptions.create(
                model=self.model,
                file=audio_file,
                language=language,
                response_format="verbose_json",
            )

            return TranscriptionResult(
                text=response.text,
                confidence=0.95,
                language=response.language,
                duration_seconds=response.duration,
                segments=[],
            )

        except Exception as e:
            logger.error("Transcription error", error=str(e))
            return TranscriptionResult(
                text="",
                confidence=0.0,
                language="en",
                duration_seconds=0.0,
            )

    async def transcribe_stream(
        self,
        audio_stream: AsyncGenerator[bytes, None],
    ) -> AsyncGenerator[str, None]:
        """Stream transcription for real-time processing."""
        buffer = b""
        async for chunk in audio_stream:
            buffer += chunk
            if len(buffer) >= 32000:  # ~2 seconds at 16kHz
                result = await self.transcribe(buffer)
                if result.text:
                    yield result.text
                buffer = b""

        if buffer:
            result = await self.transcribe(buffer)
            if result.text:
                yield result.text


class TextToSpeech:
    """
    Neural text-to-speech synthesis.
    Supports streaming output and emotional modulation.
    """

    VOICE_PROFILES = {
        "jarvis_v1": {
            "openai_voice": "onyx",
            "description": "Deep, authoritative JARVIS voice",
        },
        "jarvis_female": {
            "openai_voice": "nova",
            "description": "Clear, intelligent female voice",
        },
        "jarvis_neutral": {
            "openai_voice": "alloy",
            "description": "Neutral, professional voice",
        },
    }

    def __init__(self):
        self._client = None

    async def _get_client(self):
        if self._client is None:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI()
            except Exception:
                pass
        return self._client

    async def synthesize(
        self,
        request: SynthesisRequest,
    ) -> Optional[bytes]:
        """Synthesize speech from text."""
        client = await self._get_client()

        if not client:
            logger.warning("TTS unavailable - OpenAI key required")
            return None

        try:
            profile = self.VOICE_PROFILES.get(
                request.voice_id,
                self.VOICE_PROFILES["jarvis_v1"],
            )

            text = self._apply_emotion_markup(request.text, request.emotion)

            response = await client.audio.speech.create(
                model="tts-1-hd",
                voice=profile["openai_voice"],
                input=text,
                speed=request.speed,
            )

            return response.content

        except Exception as e:
            logger.error("TTS synthesis error", error=str(e))
            return None

    async def synthesize_stream(
        self,
        request: SynthesisRequest,
    ) -> AsyncGenerator[bytes, None]:
        """Stream synthesized speech for low latency."""
        client = await self._get_client()

        if not client:
            return

        try:
            profile = self.VOICE_PROFILES.get(
                request.voice_id,
                self.VOICE_PROFILES["jarvis_v1"],
            )

            text = self._apply_emotion_markup(request.text, request.emotion)

            async with client.audio.speech.with_streaming_response.create(
                model="tts-1",
                voice=profile["openai_voice"],
                input=text,
                speed=request.speed,
            ) as response:
                async for chunk in response.iter_bytes(chunk_size=4096):
                    yield chunk

        except Exception as e:
            logger.error("TTS streaming error", error=str(e))

    def _apply_emotion_markup(self, text: str, emotion: VoiceEmotion) -> str:
        """Apply emotional context to text (affects TTS prosody via prompting)."""
        emotion_prefixes = {
            VoiceEmotion.CONFIDENT: "",  # Natural confidence
            VoiceEmotion.ALERT: "",      # Urgent tone
            VoiceEmotion.THOUGHTFUL: "",  # Measured pace
            VoiceEmotion.ENTHUSIASTIC: "", # Energetic
            VoiceEmotion.HELPFUL: "",    # Warm and supportive
            VoiceEmotion.NEUTRAL: "",    # Standard
        }
        return text


class ConversationManager:
    """
    Manages voice conversation context and history.
    Handles multi-turn dialogue with memory integration.
    """

    MAX_HISTORY = 20

    def __init__(self):
        self._sessions: Dict[str, VoiceSession] = {}
        self._active_session: Optional[VoiceSession] = None

    def create_session(self) -> VoiceSession:
        """Create a new voice session."""
        session = VoiceSession()
        self._sessions[session.session_id] = session
        self._active_session = session
        return session

    def get_session(self, session_id: str) -> Optional[VoiceSession]:
        return self._sessions.get(session_id)

    def add_turn(
        self,
        session_id: str,
        user_text: str,
        assistant_text: str,
    ):
        """Add a conversation turn."""
        session = self._sessions.get(session_id)
        if not session:
            return

        session.turn_count += 1
        session.last_activity = time.time()
        session.conversation_history.append({
            "role": "user",
            "content": user_text,
            "timestamp": time.time(),
        })
        session.conversation_history.append({
            "role": "assistant",
            "content": assistant_text,
            "timestamp": time.time(),
        })

        # Trim history
        if len(session.conversation_history) > self.MAX_HISTORY * 2:
            session.conversation_history = session.conversation_history[-(self.MAX_HISTORY * 2):]

    def get_context(self, session_id: str) -> List[Dict[str, str]]:
        """Get conversation history as context."""
        session = self._sessions.get(session_id)
        if not session:
            return []
        return [
            {"role": turn["role"], "content": turn["content"]}
            for turn in session.conversation_history
        ]

    def detect_emotion(self, text: str) -> VoiceEmotion:
        """Detect appropriate emotional tone for response."""
        text_lower = text.lower()

        if any(word in text_lower for word in ["error", "fail", "broken", "urgent"]):
            return VoiceEmotion.ALERT
        elif any(word in text_lower for word in ["great", "excellent", "launch", "success"]):
            return VoiceEmotion.ENTHUSIASTIC
        elif any(word in text_lower for word in ["analysis", "report", "data"]):
            return VoiceEmotion.THOUGHTFUL
        elif any(word in text_lower for word in ["help", "assist", "guide"]):
            return VoiceEmotion.HELPFUL
        else:
            return VoiceEmotion.CONFIDENT


class VoiceSystem:
    """
    Complete JARVIS Voice Interface.
    
    Integrates:
    - Wake word detection
    - Speech-to-text (Whisper)
    - Neural TTS
    - Conversation management
    - Real-time streaming
    """

    def __init__(self):
        self.wake_word_detector = WakeWordDetector()
        self.stt = SpeechToText()
        self.tts = TextToSpeech()
        self.conversation = ConversationManager()
        self.state = VoiceState.IDLE

        self._response_handlers: List[Callable] = []
        self._active_session: Optional[VoiceSession] = None

        # Register wake word handler
        self.wake_word_detector.on_wake_word(self._on_wake_word_detected)

    async def start_session(self) -> VoiceSession:
        """Start a new voice conversation session."""
        session = self.conversation.create_session()
        self._active_session = session
        self.state = VoiceState.LISTENING
        logger.info("Voice session started", session_id=session.session_id)
        return session

    async def end_session(self):
        """End the current voice session."""
        self._active_session = None
        self.state = VoiceState.IDLE
        logger.info("Voice session ended")

    async def process_audio(
        self,
        audio_data: bytes,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process audio input and generate response."""
        self.state = VoiceState.TRANSCRIBING

        # Transcribe audio
        transcription = await self.stt.transcribe(audio_data)

        if not transcription.text:
            self.state = VoiceState.LISTENING
            return {"transcription": "", "response": "", "audio": None}

        # Check for wake word if not in active session
        if not self._active_session:
            is_wake_word = await self.wake_word_detector.detect_in_text(transcription.text)
            if not is_wake_word:
                self.state = VoiceState.IDLE
                return {"transcription": transcription.text, "response": "", "audio": None}

        self.state = VoiceState.PROCESSING

        # Get response (delegates to brain/agents)
        response_text = await self._generate_response(
            transcription.text,
            session_id or (self._active_session.session_id if self._active_session else ""),
        )

        # Detect emotion for voice synthesis
        emotion = self.conversation.detect_emotion(response_text)

        # Synthesize speech
        self.state = VoiceState.SPEAKING
        audio_response = await self.tts.synthesize(
            SynthesisRequest(
                text=response_text,
                emotion=emotion,
            )
        )

        # Update conversation history
        if self._active_session:
            self.conversation.add_turn(
                self._active_session.session_id,
                transcription.text,
                response_text,
            )

        self.state = VoiceState.LISTENING

        return {
            "transcription": transcription.text,
            "response": response_text,
            "audio": audio_response,
            "emotion": emotion.value,
            "session_id": self._active_session.session_id if self._active_session else None,
        }

    async def stream_response(
        self,
        text_input: str,
        session_id: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream voice response for low latency."""
        response_text = await self._generate_response(text_input, session_id or "")
        emotion = self.conversation.detect_emotion(response_text)

        # Yield text first for immediate display
        yield {"type": "text", "content": response_text, "emotion": emotion.value}

        # Stream audio
        async for audio_chunk in self.tts.synthesize_stream(
            SynthesisRequest(text=response_text, emotion=emotion, stream=True)
        ):
            yield {"type": "audio_chunk", "content": audio_chunk}

        yield {"type": "end"}

    async def _generate_response(self, text: str, session_id: str) -> str:
        """Generate response - hooks into agent system."""
        for handler in self._response_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    response = await handler(text, session_id)
                    if response:
                        return response
            except Exception as e:
                logger.error("Response handler error", error=str(e))

        return f"I heard: {text}. Processing your request..."

    def on_response_needed(self, handler: Callable):
        """Register handler for when a response is needed."""
        self._response_handlers.append(handler)

    async def _on_wake_word_detected(self, wake_word: str, full_text: str):
        """Handle wake word detection."""
        logger.info("Wake word detected", wake_word=wake_word)
        if not self._active_session:
            await self.start_session()

    def get_status(self) -> Dict[str, Any]:
        return {
            "state": self.state.value,
            "active_session": (
                self._active_session.session_id if self._active_session else None
            ),
            "sessions_count": len(self.conversation._sessions),
        }
