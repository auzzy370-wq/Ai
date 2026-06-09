'use client'

import { useState, useEffect } from 'react'
import { useNeuralStore } from '@/stores/neuralStore'
import { api } from '@/hooks/useWebSocket'

const AGENT_CONFIGS = [
  { id: 'ceo_agent', name: 'CEO', fullName: 'Chief Executive Officer', icon: '👔', color: '#4fc3f7', description: 'Strategic leadership, goal setting, executive decisions' },
  { id: 'coo_agent', name: 'COO', fullName: 'Chief Operating Officer', icon: '⚙️', color: '#81c784', description: 'Operations management, process optimization, execution' },
  { id: 'cto_agent', name: 'CTO', fullName: 'Chief Technology Officer', icon: '💻', color: '#9575cd', description: 'Technical strategy, code generation, architecture' },
  { id: 'cfo_agent', name: 'CFO', fullName: 'Chief Financial Officer', icon: '💰', color: '#ffb74d', description: 'Financial intelligence, forecasting, capital allocation' },
  { id: 'cmo_agent', name: 'CMO', fullName: 'Chief Marketing Officer', icon: '📣', color: '#f06292', description: 'Marketing strategy, campaigns, brand building' },
  { id: 'sales_agent', name: 'Sales', fullName: 'Sales Agent', icon: '🎯', color: '#4db6ac', description: 'Lead generation, pipeline management, revenue' },
  { id: 'research_agent', name: 'Research', fullName: 'Research Agent', icon: '🔬', color: '#aed581', description: 'Market research, competitive analysis, intelligence' },
  { id: 'support_agent', name: 'Support', fullName: 'Support Agent', icon: '🛟', color: '#7986cb', description: 'Customer success, ticket resolution, onboarding' },
  { id: 'legal_agent', name: 'Legal', fullName: 'Legal Agent', icon: '⚖️', color: '#ff7043', description: 'Compliance, contracts, regulatory oversight' },
  { id: 'hr_agent', name: 'HR', fullName: 'HR Agent', icon: '👥', color: '#ba68c8', description: 'Talent, culture, performance management' },
  { id: 'data_science_agent', name: 'Data Science', fullName: 'Data Science Agent', icon: '📊', color: '#26a69a', description: 'Analytics, ML models, statistical analysis' },
  { id: 'investment_agent', name: 'Investment', fullName: 'Investment Agent', icon: '📈', color: '#ef9a9a', description: 'Capital allocation, investment analysis, portfolio' },
  { id: 'operations_agent', name: 'Operations', fullName: 'Operations Agent', icon: '🔧', color: '#80cbc4', description: 'Process automation, vendor management, SOPs' },
  { id: 'product_agent', name: 'Product', fullName: 'Product Agent', icon: '🚀', color: '#ce93d8', description: 'Product strategy, roadmap, feature prioritization' },
]

interface AgentCardProps {
  config: typeof AGENT_CONFIGS[0]
  status?: any
  onSelect: () => void
  isSelected: boolean
}

function AgentCard({ config, status, onSelect, isSelected }: AgentCardProps) {
  const state = status?.state || 'offline'
  const tasksCompleted = status?.metrics?.tasks_completed || 0
  const successRate = status?.metrics?.success_rate || 0

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden
        ${isSelected
          ? 'bg-black/60'
          : 'bg-black/30 hover:bg-black/50'
        }
      `}
      style={{
        borderColor: isSelected ? `${config.color}60` : 'rgba(255,255,255,0.06)',
        boxShadow: isSelected ? `0 0 20px ${config.color}25` : 'none',
      }}
    >
      {/* Active indicator bar */}
      {state === 'active' || state === 'thinking' ? (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 animate-pulse"
          style={{ backgroundColor: config.color }}
        />
      ) : null}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border"
            style={{
              borderColor: `${config.color}30`,
              backgroundColor: `${config.color}10`,
            }}
          >
            {config.icon}
          </div>
          <div>
            <div className="text-sm font-mono font-bold" style={{ color: config.color }}>
              {config.name}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">{config.fullName}</div>
          </div>
        </div>

        {/* State badge */}
        <div className={`
          px-2 py-0.5 rounded-full text-[10px] font-mono border
          ${state === 'active' || state === 'thinking'
            ? 'border-green-500/40 text-green-400 bg-green-500/10'
            : state === 'idle'
              ? 'border-gray-600/40 text-gray-500 bg-gray-500/10'
              : 'border-gray-700/40 text-gray-600 bg-black/20'}
        `}>
          {state.toUpperCase()}
        </div>
      </div>

      <p className="text-[11px] text-gray-500 font-mono leading-relaxed mb-3">
        {config.description}
      </p>

      {/* Metrics */}
      <div className="flex items-center gap-4 text-[10px] font-mono">
        <div>
          <span className="text-gray-600">TASKS </span>
          <span style={{ color: config.color }}>{tasksCompleted}</span>
        </div>
        <div>
          <span className="text-gray-600">SUCCESS </span>
          <span className="text-green-400">{(successRate * 100).toFixed(0)}%</span>
        </div>
        {status?.goals?.length > 0 && (
          <div>
            <span className="text-gray-600">GOALS </span>
            <span className="text-white">{status.goals.length}</span>
          </div>
        )}
      </div>

      {/* Active goals */}
      {status?.goals?.length > 0 && (
        <div className="mt-3 space-y-1">
          {status.goals.slice(0, 2).map((goal: any) => (
            <div key={goal.id} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-[10px] text-gray-400 font-mono truncate">{goal.title}</div>
                <div className="h-0.5 bg-black/60 rounded-full mt-1">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${goal.progress * 100}%`,
                      backgroundColor: config.color,
                    }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-gray-600">{(goal.progress * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AgentNetwork() {
  const { agents, selectedAgent, setSelectedAgent } = useNeuralStore()
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<any>(null)
  const [taskInput, setTaskInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [taskResult, setTaskResult] = useState<string | null>(null)

  const handleAssignTask = async () => {
    if (!selectedAgent || !taskInput.trim()) return

    setIsSubmitting(true)
    setTaskResult(null)

    try {
      const result = await api.post(`/api/agents/${selectedAgent}/task`, {
        title: 'User-assigned task',
        description: taskInput,
        priority: 0.7,
      })

      setTaskResult(result.result || JSON.stringify(result, null, 2))
    } catch (err: any) {
      setTaskResult(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedConfig = AGENT_CONFIGS.find(a => a.id === selectedAgent)

  return (
    <div className="h-full flex overflow-hidden">
      {/* Agent grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-sm font-mono font-bold text-[#00ffff] mb-1">AGENT NETWORK</h2>
          <p className="text-xs text-gray-500 font-mono">
            14 autonomous executive agents • Click to interact
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {AGENT_CONFIGS.map((config) => (
            <AgentCard
              key={config.id}
              config={config}
              status={agents[config.id]}
              isSelected={selectedAgent === config.id}
              onSelect={() => {
                setSelectedAgent(config.id)
                setTaskResult(null)
              }}
            />
          ))}
        </div>
      </div>

      {/* Agent interaction panel */}
      {selectedAgent && selectedConfig && (
        <div className="w-80 flex-shrink-0 border-l border-[rgba(0,255,255,0.08)] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[rgba(0,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
                style={{
                  borderColor: `${selectedConfig.color}40`,
                  backgroundColor: `${selectedConfig.color}15`,
                }}
              >
                {selectedConfig.icon}
              </div>
              <div>
                <div className="font-mono font-bold" style={{ color: selectedConfig.color }}>
                  {selectedConfig.fullName}
                </div>
                <div className="text-xs text-gray-500 font-mono">{selectedConfig.id}</div>
              </div>
            </div>
          </div>

          {/* Agent stats */}
          {agents[selectedAgent] && (
            <div className="p-4 border-b border-[rgba(0,255,255,0.08)] grid grid-cols-2 gap-3">
              {[
                { label: 'Tasks', value: agents[selectedAgent]?.metrics?.tasks_completed || 0 },
                { label: 'Failed', value: agents[selectedAgent]?.metrics?.tasks_failed || 0 },
                { label: 'Decisions', value: agents[selectedAgent]?.metrics?.decisions_made || 0 },
                { label: 'Messages', value: agents[selectedAgent]?.metrics?.messages_sent || 0 },
              ].map(({ label, value }) => (
                <div key={label} className="neural-panel p-2 text-center">
                  <div className="text-lg font-mono font-bold" style={{ color: selectedConfig.color }}>
                    {value}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Task input */}
          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className="section-header">ASSIGN TASK</div>
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder={`Assign a task to ${selectedConfig.name} agent...`}
              rows={5}
              className="w-full px-3 py-2 bg-black/40 border border-[rgba(0,255,255,0.15)] rounded-lg
                         text-white text-xs font-mono placeholder:text-gray-600 resize-none
                         focus:outline-none focus:border-[rgba(0,255,255,0.4)] transition-all"
            />
            <button
              onClick={handleAssignTask}
              disabled={!taskInput.trim() || isSubmitting}
              className="w-full py-2.5 rounded-lg border font-mono text-sm transition-all duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: `${selectedConfig.color}50`,
                color: selectedConfig.color,
                backgroundColor: `${selectedConfig.color}10`,
              }}
            >
              {isSubmitting ? '⟳ PROCESSING...' : `▶ EXECUTE TASK`}
            </button>

            {/* Result */}
            {taskResult && (
              <div className="mt-2">
                <div className="section-header">RESULT</div>
                <div className="bg-black/40 rounded-lg p-3 text-xs font-mono text-gray-300
                               border border-[rgba(0,255,255,0.1)] max-h-48 overflow-y-auto
                               whitespace-pre-wrap">
                  {taskResult}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
