"""
Brain Controller - Central orchestrator for all cognitive functions.
Manages brain regions, coordinates neural activity, and integrates with agents.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional

import structlog

from .neural_graph import NeuralGraph, NodeType, EdgeType
from .regions import (
    NeuralActivation,
    BrainRegion,
    PrefrontalCortex,
    Hippocampus,
    TemporalCortex,
    VisualCortex,
    ParietalCortex,
    Amygdala,
    BasalGanglia,
    MotorCortex,
    CorpusCallosum,
    SignalType,
)

logger = structlog.get_logger(__name__)


class BrainController:
    """
    Central controller that integrates all brain regions into a coherent system.
    
    Acts as the "thalamus" - routing sensory information to appropriate regions
    and coordinating complex multi-region cognitive operations.
    """

    def __init__(self):
        # Initialize all brain regions
        self.prefrontal_cortex = PrefrontalCortex()
        self.hippocampus = Hippocampus()
        self.temporal_cortex = TemporalCortex()
        self.visual_cortex = VisualCortex()
        self.parietal_cortex = ParietalCortex()
        self.amygdala = Amygdala()
        self.basal_ganglia = BasalGanglia()
        self.motor_cortex = MotorCortex()
        self.corpus_callosum = CorpusCallosum()

        # Neural graph for visualization
        self.neural_graph = NeuralGraph()

        # Register all regions with corpus callosum (communication hub)
        self._regions: Dict[str, BrainRegion] = {
            "prefrontal_cortex": self.prefrontal_cortex,
            "hippocampus": self.hippocampus,
            "temporal_cortex": self.temporal_cortex,
            "visual_cortex": self.visual_cortex,
            "parietal_cortex": self.parietal_cortex,
            "amygdala": self.amygdala,
            "basal_ganglia": self.basal_ganglia,
            "motor_cortex": self.motor_cortex,
            "corpus_callosum": self.corpus_callosum,
        }

        for region in self._regions.values():
            self.corpus_callosum.register_region(region)
            region.on_activation(self._handle_region_activation)

        self._running = False
        self._cognitive_load: float = 0.0

    async def start(self):
        """Start the brain controller and background processes."""
        self._running = True
        logger.info("JARVIS Brain Controller started")

        # Start background consolidation process (like sleep cycles)
        asyncio.create_task(self._memory_consolidation_loop())
        asyncio.create_task(self._neural_decay_loop())

    async def stop(self):
        """Stop the brain controller."""
        self._running = False
        logger.info("JARVIS Brain Controller stopped")

    async def think(
        self,
        input_text: str,
        context: Optional[Dict[str, Any]] = None,
        priority: float = 0.5,
    ) -> Dict[str, Any]:
        """
        High-level cognitive processing pipeline.
        
        Mimics the full cognitive cycle:
        1. Sensory input -> Temporal Cortex (language understanding)
        2. Memory retrieval -> Hippocampus
        3. Risk assessment -> Amygdala
        4. Strategic planning -> Prefrontal Cortex
        5. Action planning -> Basal Ganglia
        6. Execution -> Motor Cortex
        """
        start_time = time.time()
        self._cognitive_load = min(1.0, self._cognitive_load + 0.2)

        logger.info("Cognitive cycle initiated", input_preview=input_text[:100])

        results = {}

        # Step 1: Language Understanding (Temporal Cortex)
        await self.neural_graph.fire_signal("temporal_cortex", "prefrontal_cortex")
        lang_activation = NeuralActivation(
            region_id="temporal_cortex",
            intensity=priority,
            payload={"action": "understand", "text": input_text},
        )
        lang_result = await self.temporal_cortex.activate(lang_activation)
        await self.neural_graph.activate_region("temporal_cortex", priority)
        results["language_understanding"] = lang_result.payload if lang_result else {}

        # Step 2: Memory Retrieval (Hippocampus)
        await self.neural_graph.fire_signal("hippocampus", "prefrontal_cortex")
        mem_activation = NeuralActivation(
            region_id="hippocampus",
            intensity=priority * 0.8,
            payload={"action": "retrieve", "query": input_text},
        )
        mem_result = await self.hippocampus.activate(mem_activation)
        await self.neural_graph.activate_region("hippocampus", priority * 0.8)
        results["memory_context"] = mem_result.payload if mem_result else {}

        # Step 3: Risk Assessment (Amygdala)
        await self.neural_graph.fire_signal("amygdala", "prefrontal_cortex")
        risk_activation = NeuralActivation(
            region_id="amygdala",
            intensity=priority * 0.6,
            payload={"action": "assess_risk", "scenario": {"input": input_text}},
        )
        risk_result = await self.amygdala.activate(risk_activation)
        await self.neural_graph.activate_region("amygdala", priority * 0.6)
        results["risk_assessment"] = risk_result.payload if risk_result else {}

        # Step 4: Executive Reasoning (Prefrontal Cortex)
        await self.neural_graph.fire_signal("prefrontal_cortex", "basal_ganglia")
        exec_activation = NeuralActivation(
            region_id="prefrontal_cortex",
            intensity=priority,
            payload={
                "action": "reason",
                "input": input_text,
                "context": context or {},
                "language_understanding": results.get("language_understanding", {}),
                "memory_context": results.get("memory_context", {}),
                "risk_assessment": results.get("risk_assessment", {}),
            },
        )
        exec_result = await self.prefrontal_cortex.activate(exec_activation)
        await self.neural_graph.activate_region("prefrontal_cortex", priority)
        results["executive_reasoning"] = exec_result.payload if exec_result else {}

        elapsed = time.time() - start_time
        self._cognitive_load = max(0.0, self._cognitive_load - 0.2)

        return {
            "input": input_text,
            "results": results,
            "cognitive_load": self._cognitive_load,
            "processing_time_ms": elapsed * 1000,
            "timestamp": time.time(),
        }

    async def plan(
        self,
        goal: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Strategic planning pipeline.
        Decomposes high-level goals into executable plans.
        """
        # Activate prefrontal cortex for strategic planning
        await self.neural_graph.fire_signal("prefrontal_cortex", "hippocampus")
        await self.neural_graph.fire_signal("prefrontal_cortex", "basal_ganglia")

        plan_activation = NeuralActivation(
            region_id="prefrontal_cortex",
            intensity=0.9,
            payload={
                "action": "decompose_goal",
                "goal": goal,
                "context": context or {},
            },
        )

        result = await self.prefrontal_cortex.activate(plan_activation)
        await self.neural_graph.activate_region("prefrontal_cortex", 0.9)

        # Store plan in hippocampus
        if result:
            mem_activation = NeuralActivation(
                region_id="hippocampus",
                intensity=0.8,
                payload={
                    "action": "store",
                    "memory": {
                        "type": "plan",
                        "goal": goal,
                        "plan": result.payload,
                    },
                },
            )
            await self.hippocampus.activate(mem_activation)
            await self.neural_graph.fire_signal("hippocampus", "prefrontal_cortex")

        return result.payload if result else {}

    async def remember(
        self,
        content: Any,
        memory_type: str = "episodic",
        importance: float = 0.5,
    ) -> str:
        """Store information in long-term memory."""
        mem_activation = NeuralActivation(
            region_id="hippocampus",
            intensity=importance,
            payload={
                "action": "store",
                "memory": {
                    "content": content,
                    "type": memory_type,
                },
            },
        )

        result = await self.hippocampus.activate(mem_activation)
        await self.neural_graph.activate_region("hippocampus", importance)

        return result.payload.get("memory_id", "") if result else ""

    async def recall(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve memories matching a query."""
        mem_activation = NeuralActivation(
            region_id="hippocampus",
            intensity=0.6,
            payload={"action": "retrieve", "query": query, "limit": limit},
        )

        result = await self.hippocampus.activate(mem_activation)
        await self.neural_graph.activate_region("hippocampus", 0.6)
        await self.neural_graph.fire_signal("hippocampus", "prefrontal_cortex")

        return result.payload.get("memories", []) if result else []

    async def assess_risk(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Perform risk assessment for a scenario."""
        risk_activation = NeuralActivation(
            region_id="amygdala",
            intensity=0.8,
            payload={"action": "assess_risk", "scenario": scenario},
        )

        result = await self.amygdala.activate(risk_activation)
        await self.neural_graph.activate_region("amygdala", 0.8)
        await self.neural_graph.fire_signal("amygdala", "prefrontal_cortex")

        return result.payload.get("assessment", {}) if result else {}

    async def execute_workflow(
        self,
        workflow_id: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute a workflow through basal ganglia -> motor cortex pipeline."""
        await self.neural_graph.fire_signal("basal_ganglia", "motor_cortex")

        bg_activation = NeuralActivation(
            region_id="basal_ganglia",
            intensity=0.85,
            payload={
                "action": "execute_workflow",
                "workflow_id": workflow_id,
                "parameters": parameters or {},
            },
        )

        result = await self.basal_ganglia.activate(bg_activation)
        await self.neural_graph.activate_region("basal_ganglia", 0.85)

        return result.payload if result else {}

    async def analyze_data(
        self,
        data: Any,
        analysis_type: str = "descriptive",
    ) -> Dict[str, Any]:
        """Analyze data through the parietal cortex."""
        pa_activation = NeuralActivation(
            region_id="parietal_cortex",
            intensity=0.75,
            payload={
                "action": "analyze_data",
                "data": data,
                "analysis_type": analysis_type,
            },
        )

        result = await self.parietal_cortex.activate(pa_activation)
        await self.neural_graph.activate_region("parietal_cortex", 0.75)
        await self.neural_graph.fire_signal("parietal_cortex", "prefrontal_cortex")

        return result.payload if result else {}

    async def _handle_region_activation(
        self,
        activation: NeuralActivation,
        result: Optional[NeuralActivation],
    ):
        """Handle activation events from brain regions."""
        await self.neural_graph.activate_region(
            activation.region_id,
            activation.intensity,
        )

    async def _memory_consolidation_loop(self):
        """Background memory consolidation (mimics sleep cycles)."""
        while self._running:
            await asyncio.sleep(300)  # Every 5 minutes
            consolidate = NeuralActivation(
                region_id="hippocampus",
                intensity=0.5,
                payload={"action": "consolidate"},
            )
            await self.hippocampus.activate(consolidate)
            logger.debug("Memory consolidation cycle completed")

    async def _neural_decay_loop(self):
        """Gradually decay neural activation levels."""
        while self._running:
            await asyncio.sleep(1.0)
            self._cognitive_load = max(0.0, self._cognitive_load - 0.05)

    def get_brain_status(self) -> Dict[str, Any]:
        """Get comprehensive brain status."""
        return {
            "regions": {
                region_id: region.get_status()
                for region_id, region in self._regions.items()
            },
            "neural_graph": self.neural_graph.get_stats(),
            "cognitive_load": self._cognitive_load,
            "running": self._running,
        }
