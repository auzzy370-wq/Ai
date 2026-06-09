/**
 * WebSocket hook for real-time JARVIS communication.
 * Handles neural graph updates, agent events, and chat.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useNeuralStore } from '@/stores/neuralStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const clientId = useRef(`client_${Math.random().toString(36).substr(2, 9)}`)

  const {
    updateGraph,
    setAgents,
    setSystemStatus,
    setOnline,
    setWsConnected,
    addMessage,
    setThinking,
  } = useNeuralStore()

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'neural_graph_update':
          updateGraph(data.data)
          break

        case 'think_result':
          setThinking(false)
          if (data.data) {
            addMessage({
              id: data.data.timestamp?.toString() || Date.now().toString(),
              role: 'assistant',
              content: JSON.stringify(data.data.results?.executive_reasoning || data.data),
              timestamp: Date.now(),
              metadata: data.data,
            })
          }
          break

        case 'task_result':
          setThinking(false)
          if (data.data?.result) {
            addMessage({
              id: Date.now().toString(),
              role: 'assistant',
              content: data.data.result,
              timestamp: Date.now(),
              agent_id: data.data.agent_id,
            })
          }
          break

        case 'voice_response':
          addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: data.text || '',
            timestamp: Date.now(),
            metadata: { voice: true },
          })
          break

        case 'agent_update':
          if (data.agents) {
            setAgents(data.agents)
          }
          break

        case 'pong':
          break

        default:
          break
      }
    } catch (err) {
      console.error('WebSocket message parse error:', err)
    }
  }, [updateGraph, setAgents, setSystemStatus, addMessage, setThinking])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/ws/${clientId.current}`)

    ws.onopen = () => {
      console.log('JARVIS WebSocket connected')
      setWsConnected(true)
      reconnectAttempts.current = 0

      // Subscribe to neural graph
      ws.send(JSON.stringify({ type: 'subscribe_neural_graph' }))

      // Start ping loop
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        } else {
          clearInterval(pingInterval)
        }
      }, 30000)
    }

    ws.onmessage = handleMessage

    ws.onclose = () => {
      setWsConnected(false)
      console.log('JARVIS WebSocket disconnected')

      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
      reconnectAttempts.current++

      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
    }

    wsRef.current = ws
  }, [handleMessage, setWsConnected])

  useEffect(() => {
    connect()

    // Check API health
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((data) => {
        setOnline(data.status === 'online')
      })
      .catch(() => setOnline(false))

    return () => {
      wsRef.current?.close()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect, setOnline])

  const send = useCallback((data: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const sendThinkRequest = useCallback(
    (input: string, context?: Record<string, any>) => {
      setThinking(true)
      addMessage({
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: Date.now(),
      })
      send({
        type: 'think',
        input,
        context,
        request_id: `req_${Date.now()}`,
      })
    },
    [send, addMessage, setThinking]
  )

  const sendAgentTask = useCallback(
    (agentId: string, title: string, description: string) => {
      setThinking(true)
      send({
        type: 'agent_task',
        agent_id: agentId,
        title,
        description,
        request_id: `task_${Date.now()}`,
      })
    },
    [send, setThinking]
  )

  return {
    send,
    sendThinkRequest,
    sendAgentTask,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  }
}

// REST API helpers
export const api = {
  baseUrl: API_URL,

  async get(path: string) {
    const res = await fetch(`${API_URL}${path}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  async post(path: string, data: any) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
}
