'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useNeuralStore } from '@/stores/neuralStore'
import { useWebSocket, api } from '@/hooks/useWebSocket'

const AGENT_COLORS: Record<string, string> = {
  ceo_agent: '#4fc3f7',
  coo_agent: '#81c784',
  cto_agent: '#9575cd',
  cfo_agent: '#ffb74d',
  cmo_agent: '#f06292',
  sales_agent: '#4db6ac',
  research_agent: '#aed581',
  support_agent: '#7986cb',
  legal_agent: '#ff7043',
  hr_agent: '#ba68c8',
  data_science_agent: '#26a69a',
  investment_agent: '#ef9a9a',
  operations_agent: '#80cbc4',
  product_agent: '#ce93d8',
}

const QUICK_COMMANDS = [
  { label: 'Build SaaS', command: 'Build me an AI-powered SaaS product for project management' },
  { label: 'Market Research', command: 'Research the AI market and identify top opportunities' },
  { label: 'Financial Analysis', command: 'Analyze our current financial position and create projections' },
  { label: 'Marketing Campaign', command: 'Create a comprehensive marketing campaign for B2B SaaS' },
  { label: 'Technical Architecture', command: 'Design a scalable microservices architecture for a fintech startup' },
  { label: 'Strategic Plan', command: 'Create a 90-day growth strategy for a new startup' },
]

export function ChatInterface() {
  const { messages, isThinking, addMessage, setThinking } = useNeuralStore()
  const { sendThinkRequest, sendAgentTask } = useWebSocket()
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async () => {
    if (!input.trim() || isThinking) return

    const text = input.trim()
    setInput('')

    if (selectedAgent === 'all') {
      // Route to brain/CEO
      try {
        addMessage({ id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() })
        setThinking(true)

        const result = await api.post('/api/brain/think', {
          input: text,
          priority: 0.8,
        })

        const responseText = result.results?.executive_reasoning?.payload?.result ||
          result.results?.executive_reasoning?.status ||
          JSON.stringify(result, null, 2)

        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: typeof responseText === 'string' ? responseText : JSON.stringify(responseText, null, 2),
          timestamp: Date.now(),
          metadata: result,
        })
      } catch (err: any) {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `[SYSTEM] API not available. Connect to JARVIS backend to enable AI responses.\n\nError: ${err.message}`,
          timestamp: Date.now(),
        })
      } finally {
        setThinking(false)
      }
    } else {
      sendAgentTask(selectedAgent, 'User Request', text)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const formatContent = (content: string) => {
    // Simple formatting for code blocks
    if (content.includes('```')) {
      return content.split('```').map((part, i) => {
        if (i % 2 === 1) {
          return (
            <pre key={i} className="my-2 text-xs overflow-auto">
              <code>{part.replace(/^\w+\n/, '')}</code>
            </pre>
          )
        }
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
      })
    }
    return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
  }

  return (
    <div className="h-full flex flex-col bg-black/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(0,255,255,0.08)]">
        <div>
          <h2 className="text-sm font-mono font-bold text-[#00ffff]">COMMAND CENTER</h2>
          <p className="text-xs text-gray-500 font-mono">Direct neural interface with JARVIS agents</p>
        </div>

        {/* Agent selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">ROUTE TO:</span>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="text-xs font-mono bg-black/60 border border-[rgba(0,255,255,0.2)] rounded px-2 py-1 text-[#00ffff] focus:outline-none"
          >
            <option value="all">🧠 Brain (All Agents)</option>
            <option value="ceo_agent">👔 CEO Agent</option>
            <option value="cto_agent">💻 CTO Agent</option>
            <option value="cfo_agent">💰 CFO Agent</option>
            <option value="cmo_agent">📣 CMO Agent</option>
            <option value="research_agent">🔬 Research Agent</option>
            <option value="product_agent">🎯 Product Agent</option>
          </select>
        </div>
      </div>

      {/* Quick commands */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto flex-shrink-0 border-b border-[rgba(0,255,255,0.05)]">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => setInput(cmd.command)}
            className="flex-shrink-0 text-xs font-mono px-3 py-1.5 rounded-full
                       border border-[rgba(0,255,255,0.15)] text-gray-400
                       hover:border-[rgba(0,255,255,0.4)] hover:text-[#00ffff]
                       transition-all duration-200"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm
              ${msg.role === 'user'
                ? 'bg-[rgba(0,255,255,0.15)] border border-[rgba(0,255,255,0.3)]'
                : msg.role === 'system'
                  ? 'bg-[rgba(255,165,0,0.15)] border border-[rgba(255,165,0,0.3)]'
                  : 'bg-[rgba(79,195,247,0.15)] border border-[rgba(79,195,247,0.3)]'}
            `}>
              {msg.role === 'user' ? '👤' : msg.role === 'system' ? '⚙️' : '🤖'}
            </div>

            {/* Message bubble */}
            <div className={`
              max-w-[80%] rounded-xl p-3 text-sm
              ${msg.role === 'user'
                ? 'bg-[rgba(0,255,255,0.08)] border border-[rgba(0,255,255,0.15)] text-white'
                : msg.role === 'system'
                  ? 'bg-[rgba(255,165,0,0.05)] border border-[rgba(255,165,0,0.15)] text-yellow-300/70 text-xs font-mono'
                  : 'bg-[rgba(15,20,35,0.8)] border border-[rgba(79,195,247,0.15)] text-gray-200'}
            `}>
              {msg.agent_id && (
                <div className="text-xs font-mono mb-1.5"
                  style={{ color: AGENT_COLORS[msg.agent_id] || '#00ffff' }}>
                  [{msg.agent_id.replace('_agent', '').toUpperCase()}]
                </div>
              )}
              <div className="font-mono text-sm leading-relaxed">
                {formatContent(msg.content)}
              </div>
              <div className="mt-1 text-[10px] text-gray-600 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(79,195,247,0.15)] border border-[rgba(79,195,247,0.3)]">
              🤖
            </div>
            <div className="bg-[rgba(15,20,35,0.8)] border border-[rgba(79,195,247,0.15)] rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#00ffff]"
                      style={{
                        animation: `neural-pulse 1.4s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-mono text-[#00ffff]/60">Neural processing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-[rgba(0,255,255,0.08)]">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command... (Shift+Enter for new line)"
              disabled={isThinking}
              rows={3}
              className="w-full px-4 py-3 bg-black/40 border border-[rgba(0,255,255,0.2)] rounded-xl
                         text-white placeholder:text-gray-600 font-mono text-sm resize-none
                         focus:outline-none focus:border-[rgba(0,255,255,0.5)]
                         focus:shadow-[0_0_15px_rgba(0,255,255,0.1)]
                         transition-all duration-200 disabled:opacity-50"
            />
            {input.length > 0 && (
              <div className="absolute bottom-3 right-3 text-xs font-mono text-gray-600">
                {input.length}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isThinking}
              className="px-6 py-3 bg-[rgba(0,255,255,0.15)] border border-[rgba(0,255,255,0.4)]
                         text-[#00ffff] font-mono text-sm rounded-xl
                         hover:bg-[rgba(0,255,255,0.25)] hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-200 flex-1"
            >
              {isThinking ? (
                <span className="animate-pulse">...</span>
              ) : (
                '▶ SEND'
              )}
            </button>
            <button
              onClick={() => { setInput('') }}
              className="px-6 py-2 border border-gray-700 text-gray-500 font-mono text-xs rounded-xl
                         hover:border-gray-500 hover:text-gray-300 transition-all duration-200"
            >
              CLEAR
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-gray-600">
          <span>Enter to send • Shift+Enter for new line • Route to specific agent for focused tasks</span>
          <span className={isThinking ? 'text-[#00ffff] animate-pulse' : ''}>
            {isThinking ? '⟳ PROCESSING' : '● READY'}
          </span>
        </div>
      </div>
    </div>
  )
}
