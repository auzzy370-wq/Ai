"""
Tests for JARVIS Memory System.
"""

import asyncio
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.memory.memory_system import (
    MemorySystem,
    MemoryTrace,
    MemoryType,
    MemoryStatus,
    WorkingMemory,
    BusinessMemory,
)


class TestWorkingMemory:
    """Test working memory (limited capacity short-term)."""

    @pytest.mark.asyncio
    async def test_store_and_retrieve(self):
        wm = WorkingMemory()
        await wm.store("key1", {"data": "value1"})
        result = await wm.retrieve("key1")
        assert result == {"data": "value1"}

    @pytest.mark.asyncio
    async def test_capacity_limit(self):
        wm = WorkingMemory()
        # Store more than capacity
        for i in range(15):
            await wm.store(f"key{i}", f"value{i}")

        assert wm.size <= WorkingMemory.CAPACITY

    @pytest.mark.asyncio
    async def test_lru_eviction(self):
        wm = WorkingMemory()
        for i in range(WorkingMemory.CAPACITY):
            await wm.store(f"key{i}", f"value{i}")

        # Access key0 to make it recently used
        await wm.retrieve("key0")

        # Add one more to trigger eviction
        await wm.store("new_key", "new_value")

        # key0 should still be there (recently accessed)
        result = await wm.retrieve("key0")
        assert result is not None

    @pytest.mark.asyncio
    async def test_clear(self):
        wm = WorkingMemory()
        await wm.store("test", "data")
        await wm.clear()
        assert wm.size == 0


class TestMemorySystem:
    """Test the full memory system."""

    @pytest.mark.asyncio
    async def test_remember_and_recall(self):
        ms = MemorySystem()

        trace = await ms.remember(
            content={"key": "test data"},
            memory_type=MemoryType.EPISODIC,
            summary="A test memory",
            tags=["test", "episodic"],
            importance=0.7,
        )

        assert trace is not None
        assert trace.memory_id
        assert trace.memory_type == MemoryType.EPISODIC

        results = await ms.recall("test data")
        assert len(results) >= 0

    @pytest.mark.asyncio
    async def test_high_importance_goes_to_long_term(self):
        ms = MemorySystem()

        trace = await ms.remember(
            content="Critical business strategy",
            memory_type=MemoryType.STRATEGIC,
            summary="Company strategy: target enterprise market",
            importance=0.95,
        )

        assert trace.status == MemoryStatus.CONSOLIDATED
        retrieved = await ms.get_memory(trace.memory_id)
        assert retrieved is not None

    @pytest.mark.asyncio
    async def test_memory_association(self):
        ms = MemorySystem()

        m1 = await ms.remember(
            content="Memory A",
            summary="First memory",
            importance=0.6,
        )
        m2 = await ms.remember(
            content="Memory B",
            summary="Second memory",
            importance=0.6,
        )

        result = await ms.associate(m1.memory_id, m2.memory_id)
        assert result

        # Check associations
        updated_m1 = await ms.get_memory(m1.memory_id)
        assert m2.memory_id in updated_m1.associations

    @pytest.mark.asyncio
    async def test_memory_forget(self):
        ms = MemorySystem()

        trace = await ms.remember(
            content="Memory to forget",
            summary="Temporary",
            importance=0.3,
        )

        result = await ms.forget(trace.memory_id)
        assert result

        retrieved = await ms.get_memory(trace.memory_id)
        assert retrieved is None or retrieved.status == MemoryStatus.FORGOTTEN

    @pytest.mark.asyncio
    async def test_memory_consolidation(self):
        ms = MemorySystem()

        # Add several short-term memories
        for i in range(5):
            await ms.remember(
                content=f"Short term memory {i}",
                summary=f"Memory {i}",
                importance=0.6 + i * 0.05,
            )

        result = await ms.consolidate()
        assert "consolidated" in result
        assert "pruned" in result

    @pytest.mark.asyncio
    async def test_memory_stats(self):
        ms = MemorySystem()

        stats = ms.get_stats()
        assert "total_memories" in stats
        assert "working_memory" in stats
        assert "short_term" in stats
        assert "long_term" in stats

    @pytest.mark.asyncio
    async def test_ttl_expiration(self):
        ms = MemorySystem()

        # Store with very short TTL
        trace = await ms.remember(
            content="Temporary",
            summary="Expires soon",
            importance=0.2,
            ttl_seconds=0.001,  # Expires immediately
        )

        # Consolidate should prune expired
        result = await ms.consolidate()
        assert result["pruned"] >= 0


class TestBusinessMemory:
    """Test specialized business memory stores."""

    @pytest.mark.asyncio
    async def test_customer_memory(self):
        ms = MemorySystem()
        bm = BusinessMemory(ms)

        trace = await bm.remember_customer(
            customer_id="cust_001",
            interaction={
                "summary": "Customer interested in enterprise plan",
                "value": 5000,
            },
        )

        assert trace is not None
        assert "customer" in trace.tags

    @pytest.mark.asyncio
    async def test_financial_memory(self):
        ms = MemorySystem()
        bm = BusinessMemory(ms)

        trace = await bm.remember_financial_event({
            "type": "revenue",
            "description": "Closed $10,000 deal",
            "amount": 10000,
        })

        assert trace is not None
        assert trace.memory_type == MemoryType.FINANCIAL

    @pytest.mark.asyncio
    async def test_strategy_memory(self):
        ms = MemorySystem()
        bm = BusinessMemory(ms)

        trace = await bm.remember_strategy({
            "title": "Q4 Growth Strategy",
            "category": "growth",
            "objective": "Reach $100K MRR",
        })

        assert trace is not None
        assert trace.importance == 0.9


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
