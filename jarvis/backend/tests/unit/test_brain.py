"""
Tests for JARVIS Brain Controller and Neural Regions.
"""

import asyncio
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.brain.regions import (
    PrefrontalCortex,
    Hippocampus,
    TemporalCortex,
    Amygdala,
    BasalGanglia,
    MotorCortex,
    CorpusCallosum,
    NeuralActivation,
    RegionState,
    SignalType,
)
from core.brain.neural_graph import NeuralGraph, NodeType, EdgeType, NeuralSignal
from core.brain.brain_controller import BrainController


class TestNeuralRegions:
    """Test individual brain regions."""

    @pytest.mark.asyncio
    async def test_prefrontal_cortex_goal_decomposition(self):
        pfc = PrefrontalCortex()
        activation = NeuralActivation(
            region_id="prefrontal_cortex",
            payload={
                "action": "decompose_goal",
                "goal": "Build an AI SaaS company",
                "context": {},
            },
        )
        result = await pfc.activate(activation)
        assert result is not None
        assert result.region_id == "prefrontal_cortex"
        assert "result" in result.payload

    @pytest.mark.asyncio
    async def test_hippocampus_memory_store_and_retrieve(self):
        hc = Hippocampus()

        # Store memory
        store_activation = NeuralActivation(
            region_id="hippocampus",
            payload={
                "action": "store",
                "memory": {"content": "Test memory", "type": "episodic"},
            },
        )
        result = await hc.activate(store_activation)
        assert result is not None
        assert "memory_id" in result.payload

        memory_id = result.payload["memory_id"]

        # Retrieve memory
        retrieve_activation = NeuralActivation(
            region_id="hippocampus",
            payload={"action": "retrieve", "query": "test", "limit": 5},
        )
        result = await hc.activate(retrieve_activation)
        assert result is not None
        assert "memories" in result.payload

    @pytest.mark.asyncio
    async def test_amygdala_risk_assessment(self):
        amygdala = Amygdala()
        activation = NeuralActivation(
            region_id="amygdala",
            intensity=0.8,
            payload={
                "action": "assess_risk",
                "scenario": {"description": "Launching a new product"},
                "risk_type": "operational",
            },
        )
        result = await amygdala.activate(activation)
        assert result is not None
        assert "assessment" in result.payload

    @pytest.mark.asyncio
    async def test_basal_ganglia_workflow_execution(self):
        bg = BasalGanglia()
        activation = NeuralActivation(
            region_id="basal_ganglia",
            payload={
                "action": "execute_workflow",
                "workflow_id": "test-workflow",
                "parameters": {"param1": "value1"},
            },
        )
        result = await bg.activate(activation)
        assert result is not None
        assert "execution" in result.payload

    @pytest.mark.asyncio
    async def test_region_activation_threshold(self):
        pfc = PrefrontalCortex()
        pfc.activation_threshold = 0.5

        # Below threshold - should return None
        low_activation = NeuralActivation(
            region_id="prefrontal_cortex",
            intensity=0.1,
            payload={"action": "reason"},
        )
        result = await pfc.activate(low_activation)
        assert result is None

    @pytest.mark.asyncio
    async def test_corpus_callosum_routing(self):
        cc = CorpusCallosum()
        hc = Hippocampus()
        cc.register_region(hc)

        activation = NeuralActivation(
            region_id="corpus_callosum",
            payload={
                "action": "route",
                "target_region": "hippocampus",
                "signal_payload": {
                    "action": "retrieve",
                    "query": "test",
                    "limit": 5,
                },
            },
        )
        result = await cc.activate(activation)
        assert result is not None

    @pytest.mark.asyncio
    async def test_region_metrics_tracking(self):
        pfc = PrefrontalCortex()
        initial_count = pfc.metrics.activation_count

        activation = NeuralActivation(
            region_id="prefrontal_cortex",
            intensity=0.8,
            payload={"action": "reason"},
        )
        await pfc.activate(activation)

        assert pfc.metrics.activation_count == initial_count + 1
        assert pfc.metrics.last_activated is not None


class TestNeuralGraph:
    """Test the neural graph system."""

    @pytest.mark.asyncio
    async def test_graph_initialized_with_brain_regions(self):
        graph = NeuralGraph()
        assert len(graph._nodes) > 0
        assert "prefrontal_cortex" in graph._nodes
        assert "hippocampus" in graph._nodes

    @pytest.mark.asyncio
    async def test_add_node(self):
        graph = NeuralGraph()
        node = await graph.add_node(
            node_id="test_node",
            node_type=NodeType.AGENT,
            label="Test Node",
        )
        assert node.node_id == "test_node"
        assert "test_node" in graph._nodes

    @pytest.mark.asyncio
    async def test_fire_signal(self):
        graph = NeuralGraph()
        initial_signals = graph._total_signals

        signal = await graph.fire_signal(
            source_id="prefrontal_cortex",
            target_id="hippocampus",
            signal_type="excitatory",
            intensity=0.8,
        )

        assert signal is not None
        assert graph._total_signals == initial_signals + 1

    @pytest.mark.asyncio
    async def test_activate_region(self):
        graph = NeuralGraph()
        await graph.activate_region("prefrontal_cortex", 0.9)

        node = graph._nodes["prefrontal_cortex"]
        assert node.activation_level == 0.9
        assert node.is_active

    def test_get_snapshot(self):
        graph = NeuralGraph()
        snapshot = graph.get_snapshot()

        assert snapshot is not None
        assert len(snapshot.nodes) > 0
        assert len(snapshot.edges) > 0
        assert isinstance(snapshot.global_activation, float)


class TestBrainController:
    """Test the central brain controller."""

    @pytest.mark.asyncio
    async def test_brain_controller_starts(self):
        brain = BrainController()
        await brain.start()
        assert brain._running
        await brain.stop()

    @pytest.mark.asyncio
    async def test_brain_think(self):
        brain = BrainController()
        await brain.start()

        result = await brain.think(
            input_text="What is the best strategy for growing a SaaS business?",
            priority=0.7,
        )

        assert result is not None
        assert "input" in result
        assert "results" in result
        assert "cognitive_load" in result

        await brain.stop()

    @pytest.mark.asyncio
    async def test_brain_plan(self):
        brain = BrainController()
        await brain.start()

        result = await brain.plan("Build a $1M ARR SaaS business in 12 months")

        assert result is not None

        await brain.stop()

    @pytest.mark.asyncio
    async def test_brain_remember_and_recall(self):
        brain = BrainController()
        await brain.start()

        memory_id = await brain.remember(
            content={"fact": "Revenue target is $1M ARR"},
            memory_type="strategic",
            importance=0.9,
        )
        assert memory_id

        memories = await brain.recall("revenue target", limit=5)
        assert isinstance(memories, list)

        await brain.stop()

    def test_brain_status(self):
        brain = BrainController()
        status = brain.get_brain_status()

        assert "regions" in status
        assert "neural_graph" in status
        assert len(status["regions"]) == 9  # All 9 brain regions


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
