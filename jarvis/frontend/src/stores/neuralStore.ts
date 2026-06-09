/**
 * Zustand store for neural graph state.
 * Receives real-time updates from WebSocket.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface NeuralNode {
  id: string
  type: string
  label: string
  position: { x: number; y: number; z: number }
  color: string
  size: number
  activation: number
  is_active: boolean
  pulse_count: number
  last_active: number | null
  metadata: Record<string, any>
}

export interface NeuralEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
  color: string
  is_active: boolean
  pulse_active: boolean
  total_signals: number
}

export interface NeuralPulse {
  id: string
  edge_id: string
  color: string
  intensity: number
  start_time: number
  duration: number
}

export interface NeuralSignal {
  id: string
  source: string
  target: string
  type: string
  intensity: number
  timestamp: number
}

export interface AgentStatus {
  agent_id: string
  name: string
  role: string
  state: string
  active_tasks: number
  completed_tasks: number
  metrics: {
    tasks_completed: number
    tasks_failed: number
    decisions_made: number
    success_rate: number
    uptime_seconds: number
  }
  goals: Array<{ id: string; title: string; progress: number; status: string }>
}

export interface SystemStatus {
  brain: any
  memory: any
  agents: Record<string, AgentStatus>
  workflows: any
  voice: any
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  agent_id?: string
  metadata?: Record<string, any>
}

export interface WorkflowExecution {
  execution_id: string
  workflow_name: string
  status: string
  progress: number
  started_at: number
}

interface NeuralState {
  // Neural graph
  nodes: NeuralNode[]
  edges: NeuralEdge[]
  activePulses: NeuralPulse[]
  recentSignals: NeuralSignal[]
  globalActivation: number
  totalSignals: number

  // Agents
  agents: Record<string, AgentStatus>
  selectedAgent: string | null

  // System
  systemStatus: SystemStatus | null
  isOnline: boolean
  wsConnected: boolean

  // Chat
  messages: ChatMessage[]
  isThinking: boolean

  // Workflows
  executions: WorkflowExecution[]

  // UI
  selectedNode: NeuralNode | null
  activeView: 'neural' | 'agents' | 'memory' | 'workflows' | 'business' | 'chat'
  sidebarOpen: boolean

  // Actions
  setNeuralGraph: (nodes: NeuralNode[], edges: NeuralEdge[]) => void
  updateGraph: (data: {
    nodes?: NeuralNode[]
    edges?: NeuralEdge[]
    active_pulses?: NeuralPulse[]
    recent_signals?: NeuralSignal[]
    global_activation?: number
    total_signals?: number
  }) => void
  setAgents: (agents: Record<string, AgentStatus>) => void
  setSystemStatus: (status: SystemStatus) => void
  setOnline: (online: boolean) => void
  setWsConnected: (connected: boolean) => void
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  setThinking: (thinking: boolean) => void
  setSelectedNode: (node: NeuralNode | null) => void
  setSelectedAgent: (agentId: string | null) => void
  setActiveView: (view: NeuralState['activeView']) => void
  setSidebarOpen: (open: boolean) => void
  addExecution: (execution: WorkflowExecution) => void
  updateExecution: (executionId: string, updates: Partial<WorkflowExecution>) => void
}

// Default brain region nodes for initial render
const DEFAULT_NODES: NeuralNode[] = [
  { id: 'prefrontal_cortex', type: 'brain_region', label: 'Prefrontal Cortex', position: { x: 0, y: 8, z: 2 }, color: '#4fc3f7', size: 3, activation: 0.3, is_active: false, pulse_count: 0, last_active: null, metadata: {} },
  { id: 'hippocampus', type: 'brain_region', label: 'Hippocampus', position: { x: -4, y: 0, z: -3 }, color: '#ab47bc', size: 2.5, activation: 0.2, is_active: false, pulse_count: 0, last_active: null, metadata: {} },
  { id: 'temporal_cortex', type: 'brain_region', label: 'Temporal Cortex', position: { x: -6, y: 2, z: 0 }, color: '#26a69a', size: 2, activation: 0.2, is_active: false, pulse_count: 0, last_active: null, metadata: {} },
  { id: 'visual_cortex', type: 'brain_region', label: 'Visual Cortex', position: { x: 0, y: -2, z: -6 }, color: '#ef5350', size: 2, activation: 0.1, is_active: false, pulse_count: 0, last_active: null, metadata: {} },
  { id: 'parietal_cortex', type: 'brain_region', label: 'Parietal Cortex', position: { x: 4, y: 4, z: 0 }, color: '#66bb6a', size: 2, activation: 0.2, is_active: false, pulse_count: 0, last_active: null, metadata: {} },
  { id: 'amygdala', type: 'brain_region', label: 'Amygdala', position: { x: -3, y: -2, z: -1 }, color: '#ff7043', size: 1.5, activation: 0.1, is_active: false, pulse_count: 0, last_active: null, metadata: {} },
  { id: 'basal_ganglia', type: 'brain_region', label: 'Basal Ganglia', position: { x: 0, y: 0, z: 0 }, color: '#ffa726', size: 2, activation: 0.2, is_active: false, pulse_count: 0, last_active: null, metadata: {} },
  { id: 'motor_cortex', type: 'brain_region', label: 'Motor Cortex', position: { x: 0, y: 6, z: -2 }, color: '#42a5f5', size: 2, activation: 0.1, is_active: false, pulse_count: 0, last_active: null, metadata: {} },
  { id: 'corpus_callosum', type: 'brain_region', label: 'Corpus Callosum', position: { x: 0, y: 2, z: 0 }, color: '#ffffff', size: 1.5, activation: 0.5, is_active: true, pulse_count: 0, last_active: null, metadata: {} },
]

const DEFAULT_EDGES: NeuralEdge[] = [
  { id: 'prefrontal_cortex→hippocampus', source: 'prefrontal_cortex', target: 'hippocampus', type: 'synaptic', weight: 0.9, color: '#4fc3f7', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'prefrontal_cortex→basal_ganglia', source: 'prefrontal_cortex', target: 'basal_ganglia', type: 'synaptic', weight: 0.9, color: '#4fc3f7', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'prefrontal_cortex→motor_cortex', source: 'prefrontal_cortex', target: 'motor_cortex', type: 'synaptic', weight: 0.85, color: '#4fc3f7', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'hippocampus→temporal_cortex', source: 'hippocampus', target: 'temporal_cortex', type: 'synaptic', weight: 0.8, color: '#ab47bc', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'hippocampus→amygdala', source: 'hippocampus', target: 'amygdala', type: 'synaptic', weight: 0.7, color: '#ab47bc', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'temporal_cortex→visual_cortex', source: 'temporal_cortex', target: 'visual_cortex', type: 'synaptic', weight: 0.7, color: '#26a69a', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'parietal_cortex→motor_cortex', source: 'parietal_cortex', target: 'motor_cortex', type: 'synaptic', weight: 0.85, color: '#66bb6a', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'amygdala→prefrontal_cortex', source: 'amygdala', target: 'prefrontal_cortex', type: 'synaptic', weight: 0.7, color: '#ff7043', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'basal_ganglia→motor_cortex', source: 'basal_ganglia', target: 'motor_cortex', type: 'synaptic', weight: 0.9, color: '#ffa726', is_active: false, pulse_active: false, total_signals: 0 },
  { id: 'corpus_callosum→prefrontal_cortex', source: 'corpus_callosum', target: 'prefrontal_cortex', type: 'synaptic', weight: 1.0, color: '#ffffff', is_active: true, pulse_active: true, total_signals: 0 },
]

export const useNeuralStore = create<NeuralState>()(
  subscribeWithSelector((set) => ({
    nodes: DEFAULT_NODES,
    edges: DEFAULT_EDGES,
    activePulses: [],
    recentSignals: [],
    globalActivation: 0,
    totalSignals: 0,

    agents: {},
    selectedAgent: null,

    systemStatus: null,
    isOnline: false,
    wsConnected: false,

    messages: [
      {
        id: '1',
        role: 'system',
        content: '// JARVIS Neural Enterprise OS initialized. All 14 agents online.',
        timestamp: Date.now(),
      },
    ],
    isThinking: false,

    executions: [],

    selectedNode: null,
    activeView: 'neural',
    sidebarOpen: true,

    setNeuralGraph: (nodes, edges) => set({ nodes, edges }),

    updateGraph: (data) =>
      set((state) => ({
        nodes: data.nodes || state.nodes,
        edges: data.edges || state.edges,
        activePulses: data.active_pulses || state.activePulses,
        recentSignals: data.recent_signals || state.recentSignals,
        globalActivation: data.global_activation ?? state.globalActivation,
        totalSignals: data.total_signals ?? state.totalSignals,
      })),

    setAgents: (agents) => set({ agents }),
    setSystemStatus: (status) => set({ systemStatus: status }),
    setOnline: (online) => set({ isOnline: online }),
    setWsConnected: (connected) => set({ wsConnected: connected }),

    addMessage: (message) =>
      set((state) => ({
        messages: [...state.messages.slice(-200), message],
      })),

    clearMessages: () => set({ messages: [] }),
    setThinking: (thinking) => set({ isThinking: thinking }),
    setSelectedNode: (node) => set({ selectedNode: node }),
    setSelectedAgent: (agentId) => set({ selectedAgent: agentId }),
    setActiveView: (view) => set({ activeView: view }),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    addExecution: (execution) =>
      set((state) => ({
        executions: [execution, ...state.executions.slice(0, 49)],
      })),

    updateExecution: (executionId, updates) =>
      set((state) => ({
        executions: state.executions.map((e) =>
          e.execution_id === executionId ? { ...e, ...updates } : e
        ),
      })),
  }))
)
