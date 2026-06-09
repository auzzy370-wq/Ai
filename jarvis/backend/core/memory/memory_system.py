"""
JARVIS Multi-Tier Memory System

Implements biological-inspired memory architecture:
- Working Memory: Active processing (7±2 items)
- Short-Term Memory: Recent experiences (hours)
- Long-Term Memory: Permanent storage (lifetime)
- Semantic Memory: Facts and knowledge
- Episodic Memory: Events and experiences
- Procedural Memory: Skills and workflows
- Strategic Memory: Business plans and strategies
- Business Memory: Customer and company data
- Financial Memory: Financial history
- Project Memory: Project context and history
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import time
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import structlog

logger = structlog.get_logger(__name__)


class MemoryType(str, Enum):
    WORKING = "working"
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    SEMANTIC = "semantic"
    EPISODIC = "episodic"
    PROCEDURAL = "procedural"
    STRATEGIC = "strategic"
    BUSINESS = "business"
    CUSTOMER = "customer"
    FINANCIAL = "financial"
    PROJECT = "project"


class MemoryStatus(str, Enum):
    ACTIVE = "active"
    CONSOLIDATED = "consolidated"
    ARCHIVED = "archived"
    FORGOTTEN = "forgotten"


@dataclass
class MemoryTrace:
    """A single memory entry with full metadata."""
    memory_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    memory_type: MemoryType = MemoryType.EPISODIC
    content: Any = None
    summary: str = ""
    tags: List[str] = field(default_factory=list)
    source: str = ""
    importance: float = 0.5         # 0.0 - 1.0
    confidence: float = 1.0         # 0.0 - 1.0
    access_count: int = 0
    last_accessed: Optional[float] = None
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    status: MemoryStatus = MemoryStatus.ACTIVE
    associations: List[str] = field(default_factory=list)  # Related memory IDs
    embedding: Optional[List[float]] = None
    context: Dict[str, Any] = field(default_factory=dict)
    agent_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "memory_id": self.memory_id,
            "memory_type": self.memory_type.value,
            "content": self.content,
            "summary": self.summary,
            "tags": self.tags,
            "source": self.source,
            "importance": self.importance,
            "confidence": self.confidence,
            "access_count": self.access_count,
            "last_accessed": self.last_accessed,
            "created_at": self.created_at,
            "status": self.status.value,
            "associations": self.associations,
            "context": self.context,
            "agent_id": self.agent_id,
        }

    def update_access(self):
        """Update access statistics and strengthen memory."""
        self.access_count += 1
        self.last_accessed = time.time()
        # Strengthen importance slightly with each access (spacing effect)
        self.importance = min(1.0, self.importance + 0.02)


class WorkingMemory:
    """
    Active working memory - holds current processing context.
    Limited capacity (Miller's Law: 7±2 items).
    Fastest access, volatile.
    """

    CAPACITY = 9  # 7±2

    def __init__(self):
        self._items: OrderedDict[str, Any] = OrderedDict()
        self._attention_focus: Optional[str] = None
        self._lock = asyncio.Lock()

    async def store(self, key: str, value: Any) -> bool:
        """Store item in working memory, evicting oldest if at capacity."""
        async with self._lock:
            if key in self._items:
                self._items.move_to_end(key)
                self._items[key] = value
                return True

            if len(self._items) >= self.CAPACITY:
                # Evict least recently used
                self._items.popitem(last=False)

            self._items[key] = value
            return True

    async def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve from working memory."""
        async with self._lock:
            if key in self._items:
                self._items.move_to_end(key)
                return self._items[key]
            return None

    async def get_all(self) -> Dict[str, Any]:
        """Get all working memory contents."""
        async with self._lock:
            return dict(self._items)

    async def clear(self):
        """Clear working memory."""
        async with self._lock:
            self._items.clear()

    async def set_focus(self, key: str):
        """Set attention focus to a specific item."""
        self._attention_focus = key

    @property
    def utilization(self) -> float:
        return len(self._items) / self.CAPACITY

    @property
    def size(self) -> int:
        return len(self._items)


class MemoryIndex:
    """
    In-memory index for fast memory retrieval.
    Supports tag-based, type-based, and full-text search.
    """

    def __init__(self):
        self._by_id: Dict[str, MemoryTrace] = {}
        self._by_type: Dict[MemoryType, List[str]] = {t: [] for t in MemoryType}
        self._by_tag: Dict[str, List[str]] = {}
        self._by_agent: Dict[str, List[str]] = {}
        self._importance_index: List[Tuple[float, str]] = []  # (importance, id)

    def add(self, memory: MemoryTrace):
        """Index a memory trace."""
        self._by_id[memory.memory_id] = memory
        self._by_type[memory.memory_type].append(memory.memory_id)

        for tag in memory.tags:
            if tag not in self._by_tag:
                self._by_tag[tag] = []
            self._by_tag[tag].append(memory.memory_id)

        if memory.agent_id:
            if memory.agent_id not in self._by_agent:
                self._by_agent[memory.agent_id] = []
            self._by_agent[memory.agent_id].append(memory.memory_id)

        self._importance_index.append((memory.importance, memory.memory_id))
        self._importance_index.sort(reverse=True)

    def get(self, memory_id: str) -> Optional[MemoryTrace]:
        return self._by_id.get(memory_id)

    def get_by_type(
        self,
        memory_type: MemoryType,
        limit: int = 50,
    ) -> List[MemoryTrace]:
        ids = self._by_type.get(memory_type, [])[-limit:]
        return [self._by_id[i] for i in ids if i in self._by_id]

    def get_by_tags(
        self,
        tags: List[str],
        limit: int = 20,
    ) -> List[MemoryTrace]:
        matching_ids = set()
        for tag in tags:
            if tag in self._by_tag:
                matching_ids.update(self._by_tag[tag])

        memories = [self._by_id[i] for i in matching_ids if i in self._by_id]
        memories.sort(key=lambda m: m.importance, reverse=True)
        return memories[:limit]

    def get_by_agent(
        self,
        agent_id: str,
        limit: int = 50,
    ) -> List[MemoryTrace]:
        ids = self._by_agent.get(agent_id, [])[-limit:]
        return [self._by_id[i] for i in ids if i in self._by_id]

    def get_most_important(self, limit: int = 10) -> List[MemoryTrace]:
        top_ids = [mid for _, mid in self._importance_index[:limit]]
        return [self._by_id[i] for i in top_ids if i in self._by_id]

    def search_text(self, query: str, limit: int = 20) -> List[MemoryTrace]:
        """Simple text search across memory content summaries."""
        query_lower = query.lower()
        results = []

        for memory in self._by_id.values():
            score = 0
            summary_lower = memory.summary.lower()
            if query_lower in summary_lower:
                score += 2
            for tag in memory.tags:
                if query_lower in tag.lower():
                    score += 1
            if score > 0:
                results.append((score * memory.importance, memory))

        results.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in results[:limit]]

    def remove(self, memory_id: str):
        """Remove a memory from all indices."""
        if memory_id not in self._by_id:
            return

        memory = self._by_id.pop(memory_id)
        self._by_type[memory.memory_type] = [
            i for i in self._by_type[memory.memory_type] if i != memory_id
        ]

        for tag in memory.tags:
            if tag in self._by_tag:
                self._by_tag[tag] = [i for i in self._by_tag[tag] if i != memory_id]

        self._importance_index = [
            (imp, mid) for imp, mid in self._importance_index if mid != memory_id
        ]

    @property
    def size(self) -> int:
        return len(self._by_id)


class MemoryConsolidator:
    """
    Handles memory consolidation - moving from short-term to long-term.
    Mimics sleep-dependent memory consolidation in biological systems.
    """

    def __init__(self, memory_system: "MemorySystem"):
        self._memory_system = memory_system
        self._consolidation_count = 0

    async def consolidate(self) -> Dict[str, Any]:
        """
        Run memory consolidation:
        1. Evaluate short-term memories
        2. Move important ones to long-term
        3. Create associations between related memories
        4. Prune low-importance expired memories
        """
        consolidated = 0
        pruned = 0
        associations_created = 0

        short_term = self._memory_system._short_term_index.get_by_type(
            MemoryType.SHORT_TERM, limit=100
        )

        for memory in short_term:
            # Consolidate if important enough
            if memory.importance > 0.5 or memory.access_count > 3:
                memory.memory_type = MemoryType.LONG_TERM
                memory.status = MemoryStatus.CONSOLIDATED
                self._memory_system._long_term_index.add(memory)
                consolidated += 1

        # Prune expired/low-importance memories
        all_memories = list(self._memory_system._short_term_index._by_id.values())
        now = time.time()
        for memory in all_memories:
            if memory.expires_at and memory.expires_at < now:
                memory.status = MemoryStatus.FORGOTTEN
                self._memory_system._short_term_index.remove(memory.memory_id)
                pruned += 1
            elif memory.importance < 0.1 and memory.access_count == 0:
                self._memory_system._short_term_index.remove(memory.memory_id)
                pruned += 1

        self._consolidation_count += 1

        return {
            "consolidated": consolidated,
            "pruned": pruned,
            "associations_created": associations_created,
            "consolidation_cycle": self._consolidation_count,
        }


class MemorySystem:
    """
    Unified memory management system integrating all memory tiers.
    
    Acts as the complete memory infrastructure for JARVIS,
    coordinating working, short-term, and long-term memory.
    """

    def __init__(self):
        self.working_memory = WorkingMemory()
        self._short_term_index = MemoryIndex()
        self._long_term_index = MemoryIndex()
        self._semantic_index = MemoryIndex()  # Facts, knowledge
        self._procedural_index = MemoryIndex()  # Skills, workflows
        self._consolidator = MemoryConsolidator(self)
        self._total_memories = 0
        self._lock = asyncio.Lock()

    async def remember(
        self,
        content: Any,
        memory_type: MemoryType = MemoryType.EPISODIC,
        summary: str = "",
        tags: Optional[List[str]] = None,
        importance: float = 0.5,
        source: str = "",
        agent_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        ttl_seconds: Optional[float] = None,
    ) -> MemoryTrace:
        """Store a new memory trace."""
        memory = MemoryTrace(
            memory_type=memory_type,
            content=content,
            summary=summary or str(content)[:200],
            tags=tags or [],
            source=source,
            importance=importance,
            agent_id=agent_id,
            context=context or {},
            expires_at=time.time() + ttl_seconds if ttl_seconds else None,
        )

        async with self._lock:
            self._total_memories += 1

            # Route to appropriate index based on type and importance
            if memory_type in (MemoryType.SEMANTIC, MemoryType.PROCEDURAL):
                if memory_type == MemoryType.SEMANTIC:
                    self._semantic_index.add(memory)
                else:
                    self._procedural_index.add(memory)
                self._long_term_index.add(memory)
            elif importance >= 0.8:
                # Highly important goes directly to long-term
                memory.status = MemoryStatus.CONSOLIDATED
                self._long_term_index.add(memory)
            else:
                # Standard path: short-term first
                memory.memory_type = memory_type
                self._short_term_index.add(memory)

            # Also add to working memory context if very recent
            await self.working_memory.store(
                f"recent_{memory.memory_id[:8]}",
                {"summary": memory.summary, "id": memory.memory_id},
            )

        logger.debug(
            "Memory stored",
            memory_id=memory.memory_id,
            type=memory_type.value,
            importance=importance,
        )

        return memory

    async def recall(
        self,
        query: str,
        memory_types: Optional[List[MemoryType]] = None,
        tags: Optional[List[str]] = None,
        agent_id: Optional[str] = None,
        limit: int = 20,
        min_importance: float = 0.0,
    ) -> List[MemoryTrace]:
        """
        Retrieve memories matching query with relevance ranking.
        Searches working, short-term, and long-term memory.
        """
        results = []
        seen_ids = set()

        # Search long-term memory (most important)
        lt_results = self._long_term_index.search_text(query, limit=limit)
        for m in lt_results:
            if m.memory_id not in seen_ids and m.importance >= min_importance:
                results.append(m)
                seen_ids.add(m.memory_id)

        # Search short-term memory
        st_results = self._short_term_index.search_text(query, limit=limit)
        for m in st_results:
            if m.memory_id not in seen_ids and m.importance >= min_importance:
                results.append(m)
                seen_ids.add(m.memory_id)

        # Filter by type if specified
        if memory_types:
            results = [m for m in results if m.memory_type in memory_types]

        # Filter by tags
        if tags:
            tag_results = (
                self._long_term_index.get_by_tags(tags) +
                self._short_term_index.get_by_tags(tags)
            )
            tag_ids = {m.memory_id for m in tag_results}
            additional = [
                m for m in tag_results
                if m.memory_id not in seen_ids and m.importance >= min_importance
            ]
            results.extend(additional)

        # Filter by agent
        if agent_id:
            results = [m for m in results if m.agent_id == agent_id]

        # Update access stats
        for memory in results[:limit]:
            memory.update_access()

        # Sort by relevance score (importance * recency)
        now = time.time()
        results.sort(
            key=lambda m: m.importance * (1 / (1 + (now - m.created_at) / 86400)),
            reverse=True,
        )

        return results[:limit]

    async def get_memory(self, memory_id: str) -> Optional[MemoryTrace]:
        """Retrieve a specific memory by ID."""
        memory = (
            self._long_term_index.get(memory_id) or
            self._short_term_index.get(memory_id) or
            self._semantic_index.get(memory_id) or
            self._procedural_index.get(memory_id)
        )

        if memory:
            memory.update_access()

        return memory

    async def update_memory(
        self,
        memory_id: str,
        updates: Dict[str, Any],
    ) -> Optional[MemoryTrace]:
        """Update an existing memory trace."""
        memory = await self.get_memory(memory_id)
        if not memory:
            return None

        for key, value in updates.items():
            if hasattr(memory, key):
                setattr(memory, key, value)

        return memory

    async def forget(self, memory_id: str) -> bool:
        """Mark a memory as forgotten."""
        memory = await self.get_memory(memory_id)
        if not memory:
            return False

        memory.status = MemoryStatus.FORGOTTEN
        self._long_term_index.remove(memory_id)
        self._short_term_index.remove(memory_id)

        return True

    async def associate(
        self,
        memory_id_1: str,
        memory_id_2: str,
        bidirectional: bool = True,
    ) -> bool:
        """Create associative link between memories."""
        m1 = await self.get_memory(memory_id_1)
        m2 = await self.get_memory(memory_id_2)

        if not (m1 and m2):
            return False

        if memory_id_2 not in m1.associations:
            m1.associations.append(memory_id_2)

        if bidirectional and memory_id_1 not in m2.associations:
            m2.associations.append(memory_id_1)

        return True

    async def consolidate(self) -> Dict[str, Any]:
        """Run memory consolidation cycle."""
        return await self._consolidator.consolidate()

    async def get_context_window(
        self,
        agent_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[MemoryTrace]:
        """Get the most relevant recent memories for context."""
        recent = (
            self._short_term_index.get_most_important(limit // 2) +
            self._long_term_index.get_most_important(limit // 2)
        )

        if agent_id:
            recent = [m for m in recent if m.agent_id == agent_id or not m.agent_id]

        seen = set()
        unique = []
        for m in recent:
            if m.memory_id not in seen:
                seen.add(m.memory_id)
                unique.append(m)

        return unique[:limit]

    def get_stats(self) -> Dict[str, Any]:
        """Get memory system statistics."""
        return {
            "total_memories": self._total_memories,
            "working_memory": {
                "size": self.working_memory.size,
                "capacity": WorkingMemory.CAPACITY,
                "utilization": self.working_memory.utilization,
            },
            "short_term": {
                "size": self._short_term_index.size,
            },
            "long_term": {
                "size": self._long_term_index.size,
            },
            "semantic": {
                "size": self._semantic_index.size,
            },
            "procedural": {
                "size": self._procedural_index.size,
            },
        }


# Specialized memory stores for business domains

class BusinessMemory:
    """Specialized memory for business operations and company knowledge."""

    def __init__(self, memory_system: MemorySystem):
        self._memory = memory_system

    async def remember_customer(
        self,
        customer_id: str,
        interaction: Dict[str, Any],
    ) -> MemoryTrace:
        return await self._memory.remember(
            content=interaction,
            memory_type=MemoryType.CUSTOMER,
            summary=f"Customer {customer_id}: {interaction.get('summary', '')}",
            tags=["customer", customer_id],
            importance=0.7,
            source="crm",
        )

    async def remember_financial_event(
        self,
        event: Dict[str, Any],
        importance: float = 0.8,
    ) -> MemoryTrace:
        return await self._memory.remember(
            content=event,
            memory_type=MemoryType.FINANCIAL,
            summary=f"Financial: {event.get('description', '')}",
            tags=["financial", event.get("type", "transaction")],
            importance=importance,
            source="finance",
        )

    async def remember_project_milestone(
        self,
        project_id: str,
        milestone: Dict[str, Any],
    ) -> MemoryTrace:
        return await self._memory.remember(
            content=milestone,
            memory_type=MemoryType.PROJECT,
            summary=f"Project {project_id}: {milestone.get('name', '')}",
            tags=["project", project_id, "milestone"],
            importance=0.75,
            source="project_management",
        )

    async def remember_strategy(
        self,
        strategy: Dict[str, Any],
    ) -> MemoryTrace:
        return await self._memory.remember(
            content=strategy,
            memory_type=MemoryType.STRATEGIC,
            summary=f"Strategy: {strategy.get('title', '')}",
            tags=["strategy", strategy.get("category", "business")],
            importance=0.9,
            source="strategic_planning",
        )

    async def get_customer_history(
        self,
        customer_id: str,
    ) -> List[MemoryTrace]:
        return await self._memory.recall(
            query=customer_id,
            memory_types=[MemoryType.CUSTOMER],
            tags=["customer", customer_id],
        )

    async def get_financial_history(
        self,
        period: Optional[str] = None,
    ) -> List[MemoryTrace]:
        return await self._memory.recall(
            query=period or "financial",
            memory_types=[MemoryType.FINANCIAL],
            tags=["financial"],
        )
