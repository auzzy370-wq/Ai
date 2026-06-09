'use client'

import { useState } from 'react'
import { api } from '@/hooks/useWebSocket'
import { useNeuralStore } from '@/stores/neuralStore'

const METRICS = [
  { label: 'MRR', value: '$0', change: '+0%', color: '#4fc3f7' },
  { label: 'ARR', value: '$0', change: '+0%', color: '#66bb6a' },
  { label: 'CAC', value: '$0', change: '-0%', color: '#ffa726' },
  { label: 'LTV', value: '$0', change: '+0%', color: '#ab47bc' },
  { label: 'ROAS', value: '0x', change: '+0%', color: '#f06292' },
  { label: 'Churn', value: '0%', change: '-0%', color: '#ef5350' },
]

const ACTIONS = [
  {
    title: 'Build SaaS Company',
    description: 'Full autonomous company building: research → product → tech → marketing → finance',
    icon: '🚀',
    color: '#4fc3f7',
    endpoint: '/api/business/build-saas',
  },
  {
    title: 'Market Research',
    description: 'Deep market analysis, competitive intelligence, opportunity identification',
    icon: '🔬',
    color: '#66bb6a',
    endpoint: '/api/research/market',
  },
  {
    title: 'Generate Software',
    description: 'AI-powered software factory: spec → architecture → code → deployment',
    icon: '💻',
    color: '#9575cd',
    endpoint: '/api/software/generate',
  },
  {
    title: 'Financial Analysis',
    description: 'Comprehensive financial modeling, projections, and optimization',
    icon: '💰',
    color: '#ffb74d',
    endpoint: '/api/business/analyze',
  },
]

export function BusinessDashboard() {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [actionInput, setActionInput] = useState('')
  const [result, setResult] = useState<any>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const { addMessage } = useNeuralStore()

  const executeAction = async (action: typeof ACTIONS[0]) => {
    if (!actionInput.trim()) return

    setIsExecuting(true)
    setResult(null)

    try {
      addMessage({
        id: Date.now().toString(),
        role: 'system',
        content: `▶ Executing: ${action.title} - "${actionInput.slice(0, 80)}..."`,
        timestamp: Date.now(),
      })

      const result = await api.post(action.endpoint, {
        idea: actionInput,
        description: actionInput,
        query: actionInput,
        specification: actionInput,
      })

      setResult(result)

      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `✓ ${action.title} complete. Results available in Business OS.`,
        timestamp: Date.now(),
      })
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-mono font-bold text-[#00ffff]">BUSINESS OPERATING SYSTEM</h2>
        <p className="text-xs text-gray-500 font-mono mt-1">
          Autonomous business operations • Multi-agent execution
        </p>
      </div>

      {/* KPI Metrics */}
      <div>
        <div className="section-header">KEY METRICS</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {METRICS.map((m) => (
            <div key={m.label} className="metric-card">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{ color: m.color, textShadow: `0 0 10px ${m.color}50` }}>
                {m.value}
              </div>
              <div className="text-xs font-mono text-green-400 mt-1">{m.change}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Autonomous Actions */}
      <div>
        <div className="section-header">AUTONOMOUS OPERATIONS</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACTIONS.map((action) => (
            <div
              key={action.title}
              className={`
                neural-panel p-5 cursor-pointer transition-all duration-300
                ${activeAction === action.title ? 'border-opacity-60' : ''}
              `}
              style={activeAction === action.title ? { borderColor: `${action.color}60` } : {}}
              onClick={() => setActiveAction(activeAction === action.title ? null : action.title)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border flex-shrink-0"
                  style={{ borderColor: `${action.color}30`, backgroundColor: `${action.color}10` }}
                >
                  {action.icon}
                </div>
                <div className="flex-1">
                  <div className="font-mono font-bold text-sm text-white mb-1">{action.title}</div>
                  <div className="text-xs text-gray-500 font-mono leading-relaxed">{action.description}</div>
                </div>
              </div>

              {activeAction === action.title && (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    placeholder={`Describe your ${action.title.toLowerCase()} request...`}
                    rows={3}
                    className="w-full px-3 py-2 bg-black/40 border border-[rgba(0,255,255,0.15)] rounded-lg
                               text-white text-xs font-mono placeholder:text-gray-600 resize-none
                               focus:outline-none focus:border-[rgba(0,255,255,0.4)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); executeAction(action) }}
                    disabled={!actionInput.trim() || isExecuting}
                    className="w-full py-2 rounded-lg border font-mono text-sm transition-all duration-200
                               disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: `${action.color}50`, color: action.color, backgroundColor: `${action.color}10` }}
                  >
                    {isExecuting ? '⟳ EXECUTING...' : `▶ RUN ${action.title.toUpperCase()}`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div>
          <div className="section-header">EXECUTION RESULTS</div>
          <div className="neural-panel p-4">
            {result.error ? (
              <div className="text-red-400 font-mono text-sm">Error: {result.error}</div>
            ) : (
              <div className="space-y-4">
                {result.phases && Object.entries(result.phases).map(([phase, data]: [string, any]) => (
                  <div key={phase}>
                    <div className="text-xs font-mono text-[#00ffff] uppercase mb-2">
                      {phase.replace('_', ' ')}
                    </div>
                    <div className="text-xs font-mono text-gray-300 bg-black/40 rounded p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {typeof data?.result === 'string' ? data.result : JSON.stringify(data, null, 2)}
                    </div>
                  </div>
                ))}
                {!result.phases && (
                  <pre className="text-xs font-mono text-gray-300 max-h-80 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business modules grid */}
      <div>
        <div className="section-header">BUSINESS MODULES</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: 'CRM', icon: '👥', status: 'ready' },
            { name: 'Accounting', icon: '📊', status: 'ready' },
            { name: 'Marketing', icon: '📣', status: 'ready' },
            { name: 'Sales', icon: '🎯', status: 'ready' },
            { name: 'Support', icon: '🛟', status: 'ready' },
            { name: 'Analytics', icon: '📈', status: 'ready' },
            { name: 'Projects', icon: '📋', status: 'ready' },
            { name: 'HR', icon: '👤', status: 'ready' },
          ].map((module) => (
            <div
              key={module.name}
              className="neural-panel p-3 flex items-center gap-2 cursor-pointer
                         hover:border-[rgba(0,255,255,0.3)] transition-all"
            >
              <span className="text-xl">{module.icon}</span>
              <div>
                <div className="text-xs font-mono text-white">{module.name}</div>
                <div className="text-[10px] font-mono text-green-400">● {module.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
