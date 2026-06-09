'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useNeuralStore } from '@/stores/neuralStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { AgentNetwork } from '@/components/agents/AgentNetwork'
import { ChatInterface } from '@/components/dashboard/ChatInterface'
import { BusinessDashboard } from '@/components/business/BusinessDashboard'
import { WorkflowDashboard } from '@/components/workflows/WorkflowDashboard'
import { MemoryExplorer } from '@/components/memory/MemoryExplorer'
import { SystemMetrics } from '@/components/dashboard/SystemMetrics'
import { VoiceInterface } from '@/components/voice/VoiceInterface'

// Dynamic import for Three.js to avoid SSR issues
const NeuralVisualization = dynamic(
  () => import('@/components/neural/NeuralVisualization').then(m => ({ default: m.NeuralVisualization })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[#00ffff]/50 font-mono text-sm animate-pulse">
          LOADING NEURAL VISUALIZATION...
        </div>
      </div>
    ),
  }
)

const NAV_ITEMS = [
  { id: 'neural', label: 'Neural Map', icon: '🧠', shortcut: '1' },
  { id: 'agents', label: 'Agents', icon: '🤖', shortcut: '2' },
  { id: 'chat', label: 'Command', icon: '💬', shortcut: '3' },
  { id: 'workflows', label: 'Workflows', icon: '⚡', shortcut: '4' },
  { id: 'business', label: 'Business OS', icon: '📊', shortcut: '5' },
  { id: 'memory', label: 'Memory', icon: '💾', shortcut: '6' },
] as const

export function NeuralOSLayout() {
  const { activeView, setActiveView, isOnline, wsConnected, agents, totalSignals, globalActivation } = useNeuralStore()
  const { sendThinkRequest } = useWebSocket()
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [showNodeInfo, setShowNodeInfo] = useState(false)

  const activeAgents = Object.values(agents).filter(a => a.state === 'active' || a.state === 'thinking').length
  const totalAgents = Object.keys(agents).length || 14

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return
      const nav = NAV_ITEMS.find(n => n.shortcut === e.key)
      if (nav) setActiveView(nav.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveView])

  const handleNodeClick = (node: any) => {
    setSelectedNode(node)
    setShowNodeInfo(true)
  }

  return (
    <div className="min-h-screen bg-[#050810] flex flex-col overflow-hidden">
      {/* ===== TOP HEADER BAR ===== */}
      <header className="h-14 flex items-center px-6 border-b border-[rgba(0,255,255,0.08)] bg-black/60 backdrop-blur-xl z-50 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-8">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border border-[#00ffff]/60 animate-[spin_4s_linear_infinite]" />
            <div className="absolute inset-1 rounded-full border border-[#00ffff]/30 animate-[spin_3s_linear_infinite_reverse]" />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-display font-bold text-[#00ffff]"
              style={{ textShadow: '0 0 10px rgba(0,255,255,0.8)' }}>
              J
            </div>
          </div>
          <div>
            <div className="text-sm font-display font-bold text-[#00ffff] leading-none"
              style={{ textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
              JARVIS
            </div>
            <div className="text-[9px] font-mono text-[#00ffff]/40 tracking-widest leading-none">
              NEURAL OS
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono
                transition-all duration-200
                ${activeView === item.id
                  ? 'bg-[rgba(0,255,255,0.15)] text-[#00ffff] border border-[rgba(0,255,255,0.3)]'
                  : 'text-gray-400 hover:text-[#00ffff] hover:bg-[rgba(0,255,255,0.05)]'
                }
              `}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              <span className="hidden lg:inline text-[10px] text-gray-600 ml-1">[{item.shortcut}]</span>
            </button>
          ))}
        </nav>

        {/* Status indicators */}
        <div className="flex items-center gap-4 ml-4">
          {/* System stats */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-gray-400">{totalAgents} AGENTS</span>
            </div>
            <div className="text-[rgba(0,255,255,0.5)]">
              {totalSignals.toLocaleString()} SIGNALS
            </div>
            <div className="text-[rgba(0,255,255,0.5)]">
              {(globalActivation * 100).toFixed(0)}% ACTIVE
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
              wsConnected
                ? 'border-green-500/30 text-green-400 bg-green-500/10'
                : 'border-red-500/30 text-red-400 bg-red-500/10'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {wsConnected ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>

          {/* Voice button */}
          <VoiceInterface compact />
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Metrics */}
        <aside className="w-64 flex-shrink-0 border-r border-[rgba(0,255,255,0.08)] bg-black/30 overflow-y-auto hidden xl:block">
          <SystemMetrics />
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden relative">
          {activeView === 'neural' && (
            <div className="w-full h-full relative">
              <NeuralVisualization
                className="w-full h-full"
                onNodeClick={handleNodeClick}
              />

              {/* Node info overlay */}
              {showNodeInfo && selectedNode && (
                <div className="absolute top-4 right-4 neural-panel p-4 w-64 z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-[#00ffff]">NODE INFO</span>
                    <button
                      onClick={() => setShowNodeInfo(false)}
                      className="text-gray-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">ID</span>
                      <span className="text-[#00ffff]">{selectedNode.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">TYPE</span>
                      <span className="text-white">{selectedNode.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ACTIVATION</span>
                      <span className="text-green-400">{(selectedNode.activation * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">STATUS</span>
                      <span className={selectedNode.is_active ? 'text-green-400' : 'text-gray-500'}>
                        {selectedNode.is_active ? 'ACTIVE' : 'IDLE'}
                      </span>
                    </div>
                    {selectedNode.pulse_count > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">PULSES</span>
                        <span className="text-[#00ffff]">{selectedNode.pulse_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'agents' && <AgentNetwork />}
          {activeView === 'chat' && <ChatInterface />}
          {activeView === 'workflows' && <WorkflowDashboard />}
          {activeView === 'business' && <BusinessDashboard />}
          {activeView === 'memory' && <MemoryExplorer />}
        </main>
      </div>

      {/* ===== STATUS BAR ===== */}
      <footer className="h-6 flex items-center px-4 border-t border-[rgba(0,255,255,0.05)] bg-black/60 flex-shrink-0">
        <div className="flex items-center gap-6 text-[10px] font-mono text-gray-600">
          <span>JARVIS NEURAL OS v1.0.0</span>
          <span className="text-gray-700">|</span>
          <span>API: {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          <span className="text-gray-700">|</span>
          <span>WS: {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          <span className="text-gray-700">|</span>
          <span>AGENTS: {totalAgents}/14</span>
          <span className="text-gray-700">|</span>
          <span>NEURAL SIGNALS: {totalSignals.toLocaleString()}</span>
        </div>
        <div className="ml-auto text-[10px] font-mono text-[rgba(0,255,255,0.3)]">
          COGNITIVE LOAD: {(globalActivation * 100).toFixed(1)}%
        </div>
      </footer>
    </div>
  )
}
