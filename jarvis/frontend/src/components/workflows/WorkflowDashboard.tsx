'use client'

import { useState } from 'react'
import { useNeuralStore } from '@/stores/neuralStore'
import { api } from '@/hooks/useWebSocket'

export function WorkflowDashboard() {
  const { executions } = useNeuralStore()
  const [activeTab, setActiveTab] = useState<'executions' | 'builder'>('executions')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[rgba(0,255,255,0.08)] flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-sm font-mono font-bold text-[#00ffff]">WORKFLOW ORCHESTRATION</h2>
          <p className="text-xs text-gray-500 font-mono">DAG execution engine with self-healing</p>
        </div>
        <div className="flex gap-2">
          {(['executions', 'builder'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                activeTab === tab
                  ? 'border-[rgba(0,255,255,0.4)] text-[#00ffff] bg-[rgba(0,255,255,0.1)]'
                  : 'border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'executions' ? (
          <div className="space-y-4">
            <div className="section-header">WORKFLOW EXECUTIONS</div>

            {executions.length === 0 ? (
              <div className="neural-panel p-8 text-center">
                <div className="text-4xl mb-3">⚡</div>
                <div className="text-sm font-mono text-gray-400">No executions yet</div>
                <div className="text-xs font-mono text-gray-600 mt-2">
                  Trigger a workflow or use the Business OS to start automated operations
                </div>
              </div>
            ) : (
              executions.map((exec) => (
                <div key={exec.execution_id} className="neural-panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-white">{exec.workflow_name}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                      exec.status === 'completed' ? 'border-green-500/40 text-green-400'
                      : exec.status === 'running' ? 'border-blue-500/40 text-blue-400'
                      : exec.status === 'failed' ? 'border-red-500/40 text-red-400'
                      : 'border-gray-600/40 text-gray-400'
                    }`}>
                      {exec.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${exec.progress * 100}%`,
                        backgroundColor: exec.status === 'failed' ? '#ef5350' : '#00ffff',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] font-mono text-gray-600">{exec.execution_id.slice(0, 8)}...</span>
                    <span className="text-[10px] font-mono text-gray-500">
                      {(exec.progress * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="section-header">WORKFLOW BUILDER</div>
            <div className="neural-panel p-8 text-center">
              <div className="text-4xl mb-3">🔧</div>
              <div className="text-sm font-mono text-gray-400">Visual Workflow Builder</div>
              <div className="text-xs font-mono text-gray-600 mt-2">
                Drag-and-drop workflow creation with agent steps, conditions, and parallel execution
              </div>
              <div className="mt-4 text-xs font-mono text-[#00ffff]/40">
                // Full workflow builder UI in production
              </div>
            </div>

            {/* Built-in workflow templates */}
            <div className="section-header mt-4">TEMPLATES</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Market Research Pipeline', steps: 5, category: 'Research' },
                { name: 'SaaS Launch Workflow', steps: 12, category: 'Business' },
                { name: 'Content Calendar', steps: 7, category: 'Marketing' },
                { name: 'Customer Onboarding', steps: 8, category: 'Support' },
                { name: 'Financial Reporting', steps: 6, category: 'Finance' },
                { name: 'Code Review Pipeline', steps: 4, category: 'Engineering' },
              ].map((tmpl) => (
                <div key={tmpl.name} className="neural-panel p-3 cursor-pointer hover:border-[rgba(0,255,255,0.3)] transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-white">{tmpl.name}</div>
                      <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                        {tmpl.steps} steps • {tmpl.category}
                      </div>
                    </div>
                    <button className="text-[10px] font-mono px-2 py-1 border border-[rgba(0,255,255,0.2)] text-[#00ffff] rounded hover:bg-[rgba(0,255,255,0.1)] transition-all">
                      USE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
