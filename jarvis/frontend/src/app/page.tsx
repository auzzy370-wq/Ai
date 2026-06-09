'use client'

import { useState, useEffect } from 'react'
import { NeuralOSLayout } from '@/components/dashboard/NeuralOSLayout'

export default function Home() {
  const [isBooting, setIsBooting] = useState(true)
  const [bootProgress, setBootProgress] = useState(0)
  const [bootMessages, setBootMessages] = useState<string[]>([])

  const BOOT_SEQUENCE = [
    '[INIT] JARVIS Neural Enterprise OS v1.0.0',
    '[SYS]  Loading cognitive architecture...',
    '[MEM]  Initializing memory subsystems...',
    '[NET]  Establishing neural graph...',
    '[AGT]  Spawning 14 executive agents...',
    '[VIS]  Neural visualization engine ready...',
    '[VOI]  Voice synthesis system online...',
    '[SEC]  Security protocols active...',
    '[DB]   Database connections established...',
    '[API]  REST + WebSocket APIs online...',
    '',
    '>>> ALL SYSTEMS OPERATIONAL <<<',
    '>>> JARVIS IS ONLINE <<<',
  ]

  useEffect(() => {
    let idx = 0
    const interval = setInterval(() => {
      if (idx < BOOT_SEQUENCE.length) {
        setBootMessages(prev => [...prev, BOOT_SEQUENCE[idx]])
        setBootProgress(((idx + 1) / BOOT_SEQUENCE.length) * 100)
        idx++
      } else {
        clearInterval(interval)
        setTimeout(() => setIsBooting(false), 800)
      }
    }, 150)

    return () => clearInterval(interval)
  }, [])

  if (isBooting) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-[#00ffff] animate-[spin_3s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border border-[#00ffff]/50 animate-[spin_2s_linear_infinite_reverse]" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-display font-bold text-[#00ffff]"
                  style={{ textShadow: '0 0 20px rgba(0,255,255,0.8)' }}>
                  J
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-[#00ffff]"
                  style={{ textShadow: '0 0 20px rgba(0,255,255,0.6)' }}>
                  JARVIS
                </h1>
                <p className="text-xs font-mono text-[#00ffff]/60 tracking-widest">
                  NEURAL ENTERPRISE OS
                </p>
              </div>
            </div>
          </div>

          {/* Boot terminal */}
          <div className="neural-panel p-6 font-mono text-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(0,255,255,0.1)]">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="text-gray-500 text-xs ml-2">boot://jarvis-neural-os</span>
            </div>

            <div className="space-y-1 min-h-[300px]">
              {bootMessages.map((msg, i) => (
                <div key={i} className={`
                  ${msg.includes('OPERATIONAL') || msg.includes('ONLINE') 
                    ? 'text-[#00ffff] font-bold text-lg text-center py-2' 
                    : msg === '' ? 'h-2' : 'text-green-400'}
                `}
                  style={
                    msg.includes('OPERATIONAL') || msg.includes('ONLINE')
                      ? { textShadow: '0 0 15px rgba(0,255,255,0.8)' }
                      : {}
                  }
                >
                  {msg}
                </div>
              ))}
              {isBooting && (
                <span className="text-[#00ffff] animate-pulse">_</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00ffff] to-[#4fc3f7] rounded-full transition-all duration-200"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">SYSTEM INITIALIZATION</span>
                <span className="text-xs text-[#00ffff]">{Math.round(bootProgress)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <NeuralOSLayout />
}
