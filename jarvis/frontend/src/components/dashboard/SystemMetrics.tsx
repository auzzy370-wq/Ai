'use client'

import { useEffect, useState } from 'react'
import { useNeuralStore } from '@/stores/neuralStore'
import { api } from '@/hooks/useWebSocket'

function MetricGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="relative h-2 bg-black/60 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}50` }}
      />
    </div>
  )
}

const REGION_INFO = [
  { id: 'prefrontal_cortex', label: 'Prefrontal', color: '#4fc3f7', role: 'Planning' },
  { id: 'hippocampus', label: 'Hippocampus', color: '#ab47bc', role: 'Memory' },
  { id: 'temporal_cortex', label: 'Temporal', color: '#26a69a', role: 'Language' },
  { id: 'visual_cortex', label: 'Visual', color: '#ef5350', role: 'Vision' },
  { id: 'parietal_cortex', label: 'Parietal', color: '#66bb6a', role: 'Analytics' },
  { id: 'amygdala', label: 'Amygdala', color: '#ff7043', role: 'Risk' },
  { id: 'basal_ganglia', label: 'Basal Ganglia', color: '#ffa726', role: 'Tasks' },
  { id: 'motor_cortex', label: 'Motor', color: '#42a5f5', role: 'Actions' },
]

export function SystemMetrics() {
  const { nodes, totalSignals, globalActivation, agents, isOnline } = useNeuralStore()
  const [memStats, setMemStats] = useState<any>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
      api.get('/api/memory/stats').then(setMemStats).catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const activeNodes = nodes.filter(n => n.is_active).length

  return (
    <div className="p-4 space-y-6 text-xs font-mono">
      {/* System health */}
      <div>
        <div className="section-header">SYSTEM</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">STATUS</span>
            <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
              {isOnline ? '● ONLINE' : '○ OFFLINE'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">COGNITIVE LOAD</span>
            <span className="text-[#00ffff]">{(globalActivation * 100).toFixed(1)}%</span>
          </div>
          <MetricGauge value={globalActivation * 100} max={100} color="#00ffff" />

          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-500">TOTAL SIGNALS</span>
            <span className="text-[#00ffff]">{totalSignals.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">ACTIVE NODES</span>
            <span className="text-green-400">{activeNodes}/{nodes.length}</span>
          </div>
        </div>
      </div>

      {/* Brain regions */}
      <div>
        <div className="section-header">BRAIN REGIONS</div>
        <div className="space-y-2">
          {REGION_INFO.map((region) => {
            const node = nodes.find(n => n.id === region.id)
            const activation = node?.activation || 0
            return (
              <div key={region.id}>
                <div className="flex justify-between items-center mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: region.color,
                        boxShadow: node?.is_active ? `0 0 4px ${region.color}` : 'none',
                      }}
                    />
                    <span style={{ color: node?.is_active ? region.color : '#6b7280' }}>
                      {region.label}
                    </span>
                  </div>
                  <span className="text-gray-600">{(activation * 100).toFixed(0)}%</span>
                </div>
                <MetricGauge value={activation * 100} max={100} color={region.color} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Agent summary */}
      <div>
        <div className="section-header">AGENTS</div>
        <div className="grid grid-cols-2 gap-1">
          {['CEO', 'COO', 'CTO', 'CFO', 'CMO', 'Sales', 'Research', 'Support', 'Legal', 'HR', 'Data', 'Invest', 'Ops', 'Product'].map((name) => {
            const agentId = `${name.toLowerCase()}_agent`
            const agent = agents[agentId] || agents[`${name.toLowerCase()}_science_agent`]
            const isActive = agent?.state === 'active' || agent?.state === 'thinking'
            return (
              <div
                key={name}
                className={`
                  flex items-center gap-1 px-1.5 py-1 rounded border text-[10px]
                  ${isActive
                    ? 'border-[rgba(0,255,255,0.3)] text-[#00ffff] bg-[rgba(0,255,255,0.05)]'
                    : 'border-[rgba(255,255,255,0.05)] text-gray-600'}
                `}
              >
                <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-700'}`} />
                {name}
              </div>
            )
          })}
        </div>
      </div>

      {/* Memory stats */}
      {memStats && (
        <div>
          <div className="section-header">MEMORY</div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Working</span>
              <span className="text-[#00ffff]">
                {memStats.working_memory?.size}/{memStats.working_memory?.capacity}
              </span>
            </div>
            <MetricGauge
              value={memStats.working_memory?.utilization * 100 || 0}
              max={100}
              color="#4fc3f7"
            />
            <div className="flex justify-between">
              <span className="text-gray-500">Short-term</span>
              <span className="text-[#00ffff]">{memStats.short_term?.size || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Long-term</span>
              <span className="text-[#00ffff]">{memStats.long_term?.size || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="text-white">{memStats.total_memories || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Neural activity feed */}
      <div>
        <div className="section-header">ACTIVITY FEED</div>
        <div className="space-y-1 text-[10px] text-gray-600">
          <div className="text-green-400/60">↑ Neural graph active</div>
          <div className="text-[rgba(0,255,255,0.4)]">↑ Memory system online</div>
          <div className="text-[rgba(171,71,188,0.6)]">↑ 14 agents spawned</div>
          <div className="text-[rgba(255,167,38,0.6)]">↑ Workflows loaded</div>
          <div className="text-blue-400/50">↑ Voice system ready</div>
        </div>
      </div>
    </div>
  )
}
