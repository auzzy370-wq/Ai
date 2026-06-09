'use client'

import { useState, useRef, useEffect } from 'react'
import { useNeuralStore } from '@/stores/neuralStore'
import { api } from '@/hooks/useWebSocket'

interface VoiceInterfaceProps {
  compact?: boolean
}

export function VoiceInterface({ compact = false }: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [showPanel, setShowPanel] = useState(false)
  const recognitionRef = useRef<any>(null)
  const { addMessage } = useNeuralStore()

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const current = event.resultIndex
      const transcript = event.results[current][0].transcript
      setTranscript(transcript)

      if (event.results[current].isFinal) {
        handleVoiceInput(transcript)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setTranscript('')
    setResponse('')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const handleVoiceInput = async (text: string) => {
    setIsProcessing(true)
    addMessage({ id: Date.now().toString(), role: 'user', content: `🎤 ${text}`, timestamp: Date.now() })

    try {
      const result = await api.post('/api/voice/text', {
        text,
        session_id: sessionId,
      })

      if (result.session_id) {
        setSessionId(result.session_id)
      }

      if (result.response) {
        setResponse(result.response)
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: Date.now(),
          metadata: { voice: true },
        })

        // TTS playback if audio available
        if (result.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${result.audio}`)
          audio.play().catch(() => {})
        }
      }
    } catch (err: any) {
      setResponse('Voice processing unavailable. Connect to JARVIS backend.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => {
            setShowPanel(!showPanel)
            if (!showPanel) stopListening()
          }}
          className={`
            w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-200
            ${isListening
              ? 'border-red-500/60 bg-red-500/20 text-red-400 animate-pulse'
              : isProcessing
                ? 'border-yellow-500/60 bg-yellow-500/20 text-yellow-400'
                : 'border-[rgba(0,255,255,0.3)] bg-[rgba(0,255,255,0.05)] text-[#00ffff] hover:bg-[rgba(0,255,255,0.15)]'}
          `}
          title="Voice Interface"
        >
          🎤
        </button>

        {showPanel && (
          <div className="absolute top-10 right-0 w-72 neural-panel p-4 z-50">
            <div className="text-xs font-mono text-[#00ffff] mb-3">VOICE INTERFACE</div>

            <div className="text-[10px] font-mono text-gray-500 mb-3">
              Say "Hey Jarvis" to activate • Or press the button below
            </div>

            <button
              onClick={isListening ? stopListening : startListening}
              className={`
                w-full py-3 rounded-xl border font-mono text-sm transition-all duration-200
                ${isListening
                  ? 'border-red-500/60 bg-red-500/20 text-red-400'
                  : 'border-[rgba(0,255,255,0.3)] bg-[rgba(0,255,255,0.1)] text-[#00ffff]'}
              `}
            >
              {isListening ? '⬛ STOP' : '🎤 START LISTENING'}
            </button>

            {transcript && (
              <div className="mt-3 p-2 bg-black/40 rounded border border-[rgba(0,255,255,0.1)]">
                <div className="text-[10px] text-gray-500 mb-1">TRANSCRIPT</div>
                <div className="text-xs font-mono text-white">{transcript}</div>
              </div>
            )}

            {isProcessing && (
              <div className="mt-2 text-center text-xs font-mono text-[#00ffff] animate-pulse">
                Processing...
              </div>
            )}

            {response && (
              <div className="mt-3 p-2 bg-black/40 rounded border border-[rgba(79,195,247,0.15)]">
                <div className="text-[10px] text-[#00ffff]/60 mb-1">JARVIS RESPONSE</div>
                <div className="text-xs font-mono text-gray-300 line-clamp-4">{response}</div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="neural-panel p-6">
      <h3 className="text-sm font-mono font-bold text-[#00ffff] mb-4">VOICE INTERFACE</h3>

      <div className="flex flex-col items-center gap-6">
        {/* Main mic button */}
        <button
          onClick={isListening ? stopListening : startListening}
          className={`
            w-24 h-24 rounded-full flex items-center justify-center text-4xl
            border-2 transition-all duration-300
            ${isListening
              ? 'border-red-500 bg-red-500/20 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)]'
              : 'border-[rgba(0,255,255,0.5)] bg-[rgba(0,255,255,0.05)] hover:bg-[rgba(0,255,255,0.15)]'}
          `}
        >
          🎤
        </button>

        <div className="text-center">
          <div className="text-sm font-mono text-white">
            {isListening ? '● LISTENING...' : isProcessing ? '⟳ PROCESSING...' : 'READY'}
          </div>
          <div className="text-xs font-mono text-gray-500 mt-1">
            {isListening ? 'Speak now' : 'Say "Hey Jarvis" or press the button'}
          </div>
        </div>

        {transcript && (
          <div className="w-full p-3 bg-black/40 rounded-xl border border-[rgba(0,255,255,0.1)]">
            <div className="text-[10px] text-gray-500 font-mono mb-1">YOU SAID</div>
            <div className="text-sm font-mono text-white">{transcript}</div>
          </div>
        )}

        {response && (
          <div className="w-full p-3 bg-black/40 rounded-xl border border-[rgba(79,195,247,0.15)]">
            <div className="text-[10px] text-[#00ffff]/60 font-mono mb-1">JARVIS RESPONSE</div>
            <div className="text-sm font-mono text-gray-200">{response}</div>
          </div>
        )}
      </div>
    </div>
  )
}
