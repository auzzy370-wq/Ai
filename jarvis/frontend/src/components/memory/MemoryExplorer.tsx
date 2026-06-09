'use client'

import { useState, useEffect } from 'react'
import { api } from '@/hooks/useWebSocket'

const MEMORY_TYPES = [
  { id: 'all', label: 'All', color: '#00ffff' },
  { id: 'episodic', label: 'Episodic', color: '#4fc3f7' },
  { id: 'semantic', label: 'Semantic', color: '#66bb6a' },
  { id: 'strategic', label: 'Strategic', color: '#ab47bc' },
  { id: 'procedural', label: 'Procedural', color: '#ffa726' },
  { id: 'financial', label: 'Financial', color: '#ffb74d' },
  { id: 'customer', label: 'Customer', color: '#f06292' },
  { id: 'project', label: 'Project', color: '#4db6ac' },
]

export function MemoryExplorer() {
  const [memories, setMemories] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [isLoading, setIsLoading] = useState(false)

  const loadMemories = async (query = '', type = 'all') => {
    setIsLoading(true)
    try {
      const result = await api.post('/api/memory/search', {
        query: query || 'recent',
        memory_types: type !== 'all' ? [type] : undefined,
        limit: 50,
      })
      setMemories(result)
    } catch {
      setMemories([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await api.get('/api/memory/stats')
      setStats(result)
    } catch {}
  }

  useEffect(() => {
    loadStats()
    loadMemories()
  }, [])

  const handleSearch = () => loadMemories(searchQuery, activeType)
  const handleTypeChange = (type: string) => {
    setActiveType(type)
    loadMemories(searchQuery, type)
  }

  const importanceColor = (imp: number) => {
    if (imp >= 0.8) return '#ef5350'
    if (imp >= 0.6) return '#ffa726'
    if (imp >= 0.4) return '#66bb6a'
    return '#4fc3f7'
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[rgba(0,255,255,0.08)]">
        <h2 className="text-sm font-mono font-bold text-[#00ffff]">MEMORY EXPLORER</h2>
        <p className="text-xs text-gray-500 font-mono mt-1">
          Multi-tier neural memory system • {stats?.total_memories || 0} total memories
        </p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="px-6 py-3 border-b border-[rgba(0,255,255,0.05)] flex gap-6 text-xs font-mono">
          <div>
            <span className="text-gray-500">WORKING: </span>
            <span className="text-[#00ffff]">{stats.working_memory?.size}/{stats.working_memory?.capacity}</span>
          </div>
          <div>
            <span className="text-gray-500">SHORT-TERM: </span>
            <span className="text-[#00ffff]">{stats.short_term?.size || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">LONG-TERM: </span>
            <span className="text-[#00ffff]">{stats.long_term?.size || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">SEMANTIC: </span>
            <span className="text-[#00ffff]">{stats.semantic?.size || 0}</span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-6 py-3 border-b border-[rgba(0,255,255,0.05)]">
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search memories..."
            className="flex-1 px-3 py-2 bg-black/40 border border-[rgba(0,255,255,0.15)] rounded-lg
                       text-white text-xs font-mono placeholder:text-gray-600
                       focus:outline-none focus:border-[rgba(0,255,255,0.4)]"
          />
          <button onClick={handleSearch} className="neural-button text-xs px-4">
            SEARCH
          </button>
          <button
            onClick={async () => {
              await api.post('/api/memory/consolidate', {})
              loadStats()
            }}
            className="text-xs px-3 py-2 border border-[rgba(171,71,188,0.3)] text-[#ab47bc] rounded-lg font-mono
                       hover:bg-[rgba(171,71,188,0.1)] transition-all"
          >
            CONSOLIDATE
          </button>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {MEMORY_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleTypeChange(type.id)}
              className={`flex-shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all ${
                activeType === type.id
                  ? 'bg-[rgba(0,255,255,0.15)] text-[#00ffff] border-[rgba(0,255,255,0.4)]'
                  : 'border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-gray-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-xs font-mono text-[#00ffff] animate-pulse">Loading memories...</div>
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <div className="text-2xl">💾</div>
            <div className="text-xs font-mono text-gray-500">No memories found</div>
          </div>
        ) : (
          memories.map((mem) => (
            <div key={mem.memory_id} className="neural-panel p-3 hover:border-[rgba(0,255,255,0.2)] transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                      style={{
                        color: MEMORY_TYPES.find(t => t.id === mem.memory_type)?.color || '#00ffff',
                        borderColor: `${MEMORY_TYPES.find(t => t.id === mem.memory_type)?.color || '#00ffff'}30`,
                        backgroundColor: `${MEMORY_TYPES.find(t => t.id === mem.memory_type)?.color || '#00ffff'}10`,
                      }}
                    >
                      {mem.memory_type.toUpperCase()}
                    </span>
                    {mem.agent_id && (
                      <span className="text-[10px] font-mono text-gray-600">
                        {mem.agent_id.replace('_agent', '')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-gray-300 leading-relaxed line-clamp-2">
                    {mem.summary || String(mem.content).slice(0, 150)}
                  </div>
                  {mem.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {mem.tags.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-gray-600 border border-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div
                    className="text-[10px] font-mono"
                    style={{ color: importanceColor(mem.importance) }}
                  >
                    {(mem.importance * 100).toFixed(0)}%
                  </div>
                  <div className="text-[9px] font-mono text-gray-700">
                    {mem.access_count}x
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
