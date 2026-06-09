"""
Neural Graph - Real-time graph of neural activity, connections, and signal propagation.
Powers the 3D visualization and tracks all cognitive events.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

import structlog

logger = structlog.get_logger(__name__)


class NodeType(str, Enum):
    BRAIN_REGION = "brain_region"
    AGENT = "agent"
    MEMORY_NODE = "memory_node"
    WORKFLOW = "workflow"
    TASK = "task"
    TOOL = "tool"
    API = "api"
    DATA_SOURCE = "data_source"


class EdgeType(str, Enum):
    SYNAPTIC = "synaptic"          # Neural connection
    COMMUNICATION = "communication"  # Agent communication
    MEMORY_LINK = "memory_link"    # Memory association
    WORKFLOW_STEP = "workflow_step" # Workflow sequence
    DATA_FLOW = "data_flow"        # Data pipeline
    CONTROL = "control"            # Control signal


@dataclass
class NeuralNode:
    """A node in the neural graph (neuron cluster)."""
    node_id: str
    node_type: NodeType
    label: str
    position: Dict[str, float] = field(default_factory=lambda: {"x": 0.0, "y": 0.0, "z": 0.0})
    color: str = "#00ffff"
    size: float = 1.0
    activation_level: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    last_active: Optional[float] = None
    pulse_count: int = 0
    is_active: bool = False


@dataclass
class NeuralEdge:
    """A connection (synapse) between neural nodes."""
    edge_id: str
    source_id: str
    target_id: str
    edge_type: EdgeType
    weight: float = 1.0
    color: str = "#ffffff"
    is_active: bool = False
    pulse_active: bool = False
    pulse_position: float = 0.0  # 0.0 to 1.0 along the edge
    bandwidth: int = 0  # signals per second
    total_signals: int = 0
    created_at: float = field(default_factory=time.time)
    last_signal: Optional[float] = None


@dataclass
class NeuralSignal:
    """A signal propagating through the neural graph."""
    signal_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    source_node_id: str = ""
    target_node_id: str = ""
    signal_type: str = "excitatory"
    intensity: float = 1.0
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    propagation_path: List[str] = field(default_factory=list)
    speed: float = 1.0  # visualization speed multiplier


@dataclass
class NeuralPulse:
    """Visual pulse animation data for the frontend."""
    pulse_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    edge_id: str = ""
    start_time: float = field(default_factory=time.time)
    duration: float = 0.5  # seconds
    color: str = "#00ffff"
    intensity: float = 1.0
    signal_id: Optional[str] = None


@dataclass
class GraphSnapshot:
    """Complete snapshot of neural graph state for streaming to frontend."""
    snapshot_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    nodes: List[Dict[str, Any]] = field(default_factory=list)
    edges: List[Dict[str, Any]] = field(default_factory=list)
    active_pulses: List[Dict[str, Any]] = field(default_factory=list)
    recent_signals: List[Dict[str, Any]] = field(default_factory=list)
    global_activation: float = 0.0
    total_signals: int = 0


class NeuralGraph:
    """
    Real-time neural graph that models the JARVIS cognitive architecture.
    
    Maintains:
    - All nodes (brain regions, agents, memories, tools)
    - All edges (synaptic connections, workflows, data flows)
    - Active signal propagation
    - Real-time activation levels
    - Historical signal traces
    
    Streams graph state to frontend for 3D visualization.
    """

    # Brain region positions in 3D space (x, y, z) - normalized -10 to 10
    REGION_POSITIONS = {
        "prefrontal_cortex":  {"x": 0.0,  "y": 8.0,  "z": 2.0},
        "hippocampus":        {"x": -4.0, "y": 0.0,  "z": -3.0},
        "temporal_cortex":    {"x": -6.0, "y": 2.0,  "z": 0.0},
        "visual_cortex":      {"x": 0.0,  "y": -2.0, "z": -6.0},
        "parietal_cortex":    {"x": 4.0,  "y": 4.0,  "z": 0.0},
        "amygdala":           {"x": -3.0, "y": -2.0, "z": -1.0},
        "basal_ganglia":      {"x": 0.0,  "y": 0.0,  "z": 0.0},
        "motor_cortex":       {"x": 0.0,  "y": 6.0,  "z": -2.0},
        "corpus_callosum":    {"x": 0.0,  "y": 2.0,  "z": 0.0},
    }

    REGION_COLORS = {
        "prefrontal_cortex": "#4fc3f7",  # Cyan blue
        "hippocampus":       "#ab47bc",  # Purple
        "temporal_cortex":   "#26a69a",  # Teal
        "visual_cortex":     "#ef5350",  # Red
        "parietal_cortex":   "#66bb6a",  # Green
        "amygdala":          "#ff7043",  # Orange-red
        "basal_ganglia":     "#ffa726",  # Orange
        "motor_cortex":      "#42a5f5",  # Blue
        "corpus_callosum":   "#ffffff",  # White
    }

    def __init__(self):
        self._nodes: Dict[str, NeuralNode] = {}
        self._edges: Dict[str, NeuralEdge] = {}
        self._active_pulses: Dict[str, NeuralPulse] = {}
        self._signal_history: deque = deque(maxlen=10000)
        self._adjacency: Dict[str, Set[str]] = defaultdict(set)
        self._subscribers: List[Callable] = []
        self._total_signals: int = 0
        self._lock = asyncio.Lock()
        self._initialized = False

        self._initialize_brain_regions()

    def _initialize_brain_regions(self):
        """Create nodes for all brain regions with biological positioning."""
        brain_regions = [
            ("prefrontal_cortex", "Prefrontal Cortex", NodeType.BRAIN_REGION, 3.0),
            ("hippocampus", "Hippocampus", NodeType.BRAIN_REGION, 2.5),
            ("temporal_cortex", "Temporal Cortex", NodeType.BRAIN_REGION, 2.0),
            ("visual_cortex", "Visual Cortex", NodeType.BRAIN_REGION, 2.0),
            ("parietal_cortex", "Parietal Cortex", NodeType.BRAIN_REGION, 2.0),
            ("amygdala", "Amygdala", NodeType.BRAIN_REGION, 1.5),
            ("basal_ganglia", "Basal Ganglia", NodeType.BRAIN_REGION, 2.0),
            ("motor_cortex", "Motor Cortex", NodeType.BRAIN_REGION, 2.0),
            ("corpus_callosum", "Corpus Callosum", NodeType.BRAIN_REGION, 1.5),
        ]

        for region_id, label, node_type, size in brain_regions:
            node = NeuralNode(
                node_id=region_id,
                node_type=node_type,
                label=label,
                position=self.REGION_POSITIONS.get(region_id, {"x": 0, "y": 0, "z": 0}),
                color=self.REGION_COLORS.get(region_id, "#ffffff"),
                size=size,
            )
            self._nodes[region_id] = node

        # Define synaptic connections between brain regions
        synaptic_connections = [
            ("prefrontal_cortex", "hippocampus", 0.9),
            ("prefrontal_cortex", "temporal_cortex", 0.85),
            ("prefrontal_cortex", "parietal_cortex", 0.8),
            ("prefrontal_cortex", "basal_ganglia", 0.9),
            ("prefrontal_cortex", "motor_cortex", 0.85),
            ("hippocampus", "temporal_cortex", 0.8),
            ("hippocampus", "amygdala", 0.7),
            ("hippocampus", "parietal_cortex", 0.75),
            ("temporal_cortex", "visual_cortex", 0.7),
            ("temporal_cortex", "amygdala", 0.65),
            ("visual_cortex", "parietal_cortex", 0.8),
            ("visual_cortex", "temporal_cortex", 0.7),
            ("parietal_cortex", "motor_cortex", 0.85),
            ("amygdala", "prefrontal_cortex", 0.7),
            ("amygdala", "basal_ganglia", 0.8),
            ("basal_ganglia", "motor_cortex", 0.9),
            ("basal_ganglia", "thalamus", 0.0),  # placeholder
            ("corpus_callosum", "prefrontal_cortex", 1.0),
            ("corpus_callosum", "hippocampus", 1.0),
            ("corpus_callosum", "temporal_cortex", 1.0),
            ("corpus_callosum", "visual_cortex", 1.0),
            ("corpus_callosum", "parietal_cortex", 1.0),
            ("corpus_callosum", "amygdala", 1.0),
            ("corpus_callosum", "basal_ganglia", 1.0),
            ("corpus_callosum", "motor_cortex", 1.0),
        ]

        for source, target, weight in synaptic_connections:
            if source in self._nodes and target in self._nodes:
                self._add_edge(source, target, EdgeType.SYNAPTIC, weight)

        self._initialized = True

    def _add_edge(
        self,
        source_id: str,
        target_id: str,
        edge_type: EdgeType,
        weight: float = 1.0,
        color: Optional[str] = None,
    ) -> str:
        """Add a directed edge between nodes."""
        edge_id = f"{source_id}→{target_id}"

        if not color:
            color = self._get_edge_color(edge_type)

        edge = NeuralEdge(
            edge_id=edge_id,
            source_id=source_id,
            target_id=target_id,
            edge_type=edge_type,
            weight=weight,
            color=color,
        )

        self._edges[edge_id] = edge
        self._adjacency[source_id].add(target_id)
        return edge_id

    def _get_edge_color(self, edge_type: EdgeType) -> str:
        colors = {
            EdgeType.SYNAPTIC: "#4fc3f7",
            EdgeType.COMMUNICATION: "#ab47bc",
            EdgeType.MEMORY_LINK: "#ab47bc",
            EdgeType.WORKFLOW_STEP: "#ffa726",
            EdgeType.DATA_FLOW: "#66bb6a",
            EdgeType.CONTROL: "#ef5350",
        }
        return colors.get(edge_type, "#ffffff")

    async def add_node(
        self,
        node_id: str,
        node_type: NodeType,
        label: str,
        position: Optional[Dict[str, float]] = None,
        color: str = "#00ffff",
        size: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> NeuralNode:
        """Add a new node to the graph."""
        async with self._lock:
            if not position:
                import random
                position = {
                    "x": random.uniform(-15, 15),
                    "y": random.uniform(-15, 15),
                    "z": random.uniform(-15, 15),
                }

            node = NeuralNode(
                node_id=node_id,
                node_type=node_type,
                label=label,
                position=position,
                color=color,
                size=size,
                metadata=metadata or {},
            )
            self._nodes[node_id] = node
            await self._notify_subscribers({"type": "node_added", "node": node.__dict__})
            return node

    async def connect_nodes(
        self,
        source_id: str,
        target_id: str,
        edge_type: EdgeType = EdgeType.COMMUNICATION,
        weight: float = 1.0,
        bidirectional: bool = False,
    ) -> str:
        """Create a connection between two nodes."""
        async with self._lock:
            edge_id = self._add_edge(source_id, target_id, edge_type, weight)

            if bidirectional:
                self._add_edge(target_id, source_id, edge_type, weight)

            await self._notify_subscribers({
                "type": "edge_added",
                "edge": self._edges[edge_id].__dict__,
            })
            return edge_id

    async def fire_signal(
        self,
        source_id: str,
        target_id: str,
        signal_type: str = "excitatory",
        intensity: float = 1.0,
        payload: Optional[Dict[str, Any]] = None,
    ) -> NeuralSignal:
        """
        Fire a neural signal from source to target.
        Creates visual pulse animation.
        """
        signal = NeuralSignal(
            source_node_id=source_id,
            target_node_id=target_id,
            signal_type=signal_type,
            intensity=intensity,
            payload=payload or {},
        )

        async with self._lock:
            self._total_signals += 1
            self._signal_history.append(signal)

            # Update source node activation
            if source_id in self._nodes:
                node = self._nodes[source_id]
                node.activation_level = min(1.0, node.activation_level + intensity * 0.3)
                node.last_active = time.time()
                node.pulse_count += 1
                node.is_active = True

            # Create visual pulse on edge
            edge_id = f"{source_id}→{target_id}"
            if edge_id in self._edges:
                edge = self._edges[edge_id]
                edge.is_active = True
                edge.pulse_active = True
                edge.total_signals += 1
                edge.last_signal = time.time()

                pulse = NeuralPulse(
                    edge_id=edge_id,
                    color=self._get_signal_color(signal_type),
                    intensity=intensity,
                    signal_id=signal.signal_id,
                )
                self._active_pulses[pulse.pulse_id] = pulse

        await self._notify_subscribers({
            "type": "signal_fired",
            "signal": {
                "signal_id": signal.signal_id,
                "source": source_id,
                "target": target_id,
                "type": signal_type,
                "intensity": intensity,
                "timestamp": signal.timestamp,
            },
        })

        # Schedule pulse cleanup
        asyncio.create_task(self._cleanup_pulse_after(
            list(self._active_pulses.keys())[-1] if self._active_pulses else "",
            0.5,
        ))

        return signal

    async def activate_region(self, region_id: str, intensity: float = 1.0):
        """Mark a brain region as active with visual effect."""
        async with self._lock:
            if region_id in self._nodes:
                node = self._nodes[region_id]
                node.activation_level = intensity
                node.is_active = True
                node.last_active = time.time()

        await self._notify_subscribers({
            "type": "node_activated",
            "node_id": region_id,
            "intensity": intensity,
        })

        # Schedule decay
        asyncio.create_task(self._decay_activation(region_id, 2.0))

    async def _decay_activation(self, node_id: str, delay: float):
        """Gradually decay node activation level."""
        await asyncio.sleep(delay)
        if node_id in self._nodes:
            node = self._nodes[node_id]
            node.activation_level = max(0.0, node.activation_level - 0.3)
            if node.activation_level <= 0.1:
                node.is_active = False

    async def _cleanup_pulse_after(self, pulse_id: str, delay: float):
        """Remove pulse after animation completes."""
        await asyncio.sleep(delay)
        async with self._lock:
            if pulse_id in self._active_pulses:
                del self._active_pulses[pulse_id]

    def _get_signal_color(self, signal_type: str) -> str:
        colors = {
            "excitatory": "#00ffff",
            "inhibitory": "#ff4444",
            "modulatory": "#ffaa00",
            "feedback": "#44ff44",
        }
        return colors.get(signal_type, "#ffffff")

    def get_snapshot(self) -> GraphSnapshot:
        """Get current graph state snapshot for streaming."""
        nodes_data = []
        for node in self._nodes.values():
            nodes_data.append({
                "id": node.node_id,
                "type": node.node_type.value,
                "label": node.label,
                "position": node.position,
                "color": node.color,
                "size": node.size,
                "activation": node.activation_level,
                "is_active": node.is_active,
                "pulse_count": node.pulse_count,
                "last_active": node.last_active,
                "metadata": node.metadata,
            })

        edges_data = []
        for edge in self._edges.values():
            edges_data.append({
                "id": edge.edge_id,
                "source": edge.source_id,
                "target": edge.target_id,
                "type": edge.edge_type.value,
                "weight": edge.weight,
                "color": edge.color,
                "is_active": edge.is_active,
                "pulse_active": edge.pulse_active,
                "total_signals": edge.total_signals,
            })

        pulses_data = []
        for pulse in self._active_pulses.values():
            pulses_data.append({
                "id": pulse.pulse_id,
                "edge_id": pulse.edge_id,
                "color": pulse.color,
                "intensity": pulse.intensity,
                "start_time": pulse.start_time,
                "duration": pulse.duration,
            })

        recent_signals = []
        signals_list = list(self._signal_history)[-50:]
        for sig in signals_list:
            recent_signals.append({
                "id": sig.signal_id,
                "source": sig.source_node_id,
                "target": sig.target_node_id,
                "type": sig.signal_type,
                "intensity": sig.intensity,
                "timestamp": sig.timestamp,
            })

        total_activation = sum(n.activation_level for n in self._nodes.values())
        global_activation = total_activation / max(len(self._nodes), 1)

        return GraphSnapshot(
            nodes=nodes_data,
            edges=edges_data,
            active_pulses=pulses_data,
            recent_signals=recent_signals,
            global_activation=global_activation,
            total_signals=self._total_signals,
        )

    def subscribe(self, callback: Callable):
        """Subscribe to real-time graph events."""
        self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable):
        """Unsubscribe from graph events."""
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    async def _notify_subscribers(self, event: Dict[str, Any]):
        """Notify all subscribers of graph events."""
        for callback in self._subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logger.error("Subscriber notification error", error=str(e))

    def get_stats(self) -> Dict[str, Any]:
        """Get graph statistics."""
        active_nodes = sum(1 for n in self._nodes.values() if n.is_active)
        active_edges = sum(1 for e in self._edges.values() if e.is_active)

        return {
            "total_nodes": len(self._nodes),
            "total_edges": len(self._edges),
            "active_nodes": active_nodes,
            "active_edges": active_edges,
            "active_pulses": len(self._active_pulses),
            "total_signals": self._total_signals,
            "signal_history_size": len(self._signal_history),
        }
