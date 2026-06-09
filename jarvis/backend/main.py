"""
JARVIS Neural Enterprise OS - Backend API Server

FastAPI application serving the JARVIS AI Operating System.
Provides REST API + WebSocket endpoints for real-time neural operations.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import structlog
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.brain.brain_controller import BrainController
from core.memory.memory_system import MemorySystem, MemoryType
from core.agents.executive_agents import create_agent_network
from core.agents.agent_registry import AgentRegistry
from core.agents.base_agent import AgentTask, AgentRole
from core.workflows.engine import WorkflowEngine, WorkflowDefinition, WorkflowStep
from core.voice.voice_system import VoiceSystem

logger = structlog.get_logger(__name__)

# Global system instances
brain: Optional[BrainController] = None
memory: Optional[MemorySystem] = None
registry: Optional[AgentRegistry] = None
workflow_engine: Optional[WorkflowEngine] = None
voice: Optional[VoiceSystem] = None
agents: Dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize JARVIS systems on startup."""
    global brain, memory, registry, workflow_engine, voice, agents

    logger.info("=" * 60)
    logger.info("JARVIS NEURAL ENTERPRISE OS - INITIALIZING")
    logger.info("=" * 60)

    # Initialize memory system
    memory = MemorySystem()
    logger.info("Memory system initialized")

    # Initialize brain
    brain = BrainController()
    await brain.start()
    logger.info("Brain controller started")

    # Initialize agents
    agents = create_agent_network(memory)

    # Initialize registry and register all agents
    registry = AgentRegistry(memory)
    for agent in agents.values():
        registry.register(agent)
    await registry.start_all()
    logger.info(f"Agent network online: {len(agents)} agents")

    # Initialize workflow engine
    workflow_engine = WorkflowEngine(agent_registry=registry)
    logger.info("Workflow engine initialized")

    # Initialize voice system
    voice = VoiceSystem()

    # Connect voice to agent network (CEO handles voice commands)
    async def handle_voice_query(text: str, session_id: str) -> str:
        ceo = registry.get_by_role(AgentRole.CEO)
        if ceo:
            return await ceo.think(text)
        return "I'm sorry, the CEO agent is not available."

    voice.on_response_needed(handle_voice_query)
    logger.info("Voice system initialized")

    logger.info("JARVIS is ONLINE - All systems operational")

    yield

    # Cleanup
    logger.info("JARVIS shutting down...")
    if registry:
        await registry.stop_all()
    if brain:
        await brain.stop()
    logger.info("JARVIS offline")


app = FastAPI(
    title="JARVIS Neural Enterprise OS",
    description="Production-grade AI Operating System with neural architecture",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self._connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self._connections.pop(client_id, None)

    async def send(self, client_id: str, data: Dict[str, Any]):
        ws = self._connections.get(client_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, data: Dict[str, Any]):
        disconnected = []
        for client_id, ws in self._connections.items():
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(client_id)
        for cid in disconnected:
            self.disconnect(cid)

    @property
    def connected_count(self) -> int:
        return len(self._connections)


ws_manager = ConnectionManager()


# ========== Pydantic Models ==========

class ThinkRequest(BaseModel):
    input: str
    context: Optional[Dict[str, Any]] = None
    priority: float = 0.5


class PlanRequest(BaseModel):
    goal: str
    context: Optional[Dict[str, Any]] = None


class AgentTaskRequest(BaseModel):
    title: str
    description: str
    agent_role: Optional[str] = None
    agent_id: Optional[str] = None
    priority: float = 0.5
    context: Optional[Dict[str, Any]] = None


class MemoryStoreRequest(BaseModel):
    content: Any
    memory_type: str = "episodic"
    summary: str = ""
    tags: List[str] = []
    importance: float = 0.5
    agent_id: Optional[str] = None


class MemorySearchRequest(BaseModel):
    query: str
    memory_types: Optional[List[str]] = None
    limit: int = 20


class WorkflowCreateRequest(BaseModel):
    name: str
    description: str
    steps: Dict[str, Any]
    entry_point: str
    variables: Optional[Dict[str, Any]] = {}


class WorkflowExecuteRequest(BaseModel):
    parameters: Optional[Dict[str, Any]] = {}
    triggered_by: str = "api"


# ========== Health & Status ==========

@app.get("/health")
async def health():
    return {
        "status": "online",
        "system": "JARVIS Neural Enterprise OS",
        "version": "1.0.0",
        "timestamp": time.time(),
        "components": {
            "brain": brain is not None,
            "memory": memory is not None,
            "agents": len(agents),
            "workflow_engine": workflow_engine is not None,
            "voice": voice is not None,
        },
    }


@app.get("/status")
async def system_status():
    return {
        "brain": brain.get_brain_status() if brain else None,
        "memory": memory.get_stats() if memory else None,
        "agents": registry.get_all_statuses() if registry else {},
        "workflows": workflow_engine.get_stats() if workflow_engine else None,
        "voice": voice.get_status() if voice else None,
        "connections": ws_manager.connected_count,
    }


# ========== Brain API ==========

@app.post("/api/brain/think")
async def brain_think(request: ThinkRequest):
    if not brain:
        raise HTTPException(503, "Brain not initialized")

    result = await brain.think(
        input_text=request.input,
        context=request.context,
        priority=request.priority,
    )
    return result


@app.post("/api/brain/plan")
async def brain_plan(request: PlanRequest):
    if not brain:
        raise HTTPException(503, "Brain not initialized")

    result = await brain.plan(
        goal=request.goal,
        context=request.context,
    )
    return result


@app.get("/api/brain/status")
async def brain_status():
    if not brain:
        raise HTTPException(503, "Brain not initialized")
    return brain.get_brain_status()


@app.get("/api/brain/neural-graph")
async def neural_graph():
    if not brain:
        raise HTTPException(503, "Brain not initialized")

    snapshot = brain.neural_graph.get_snapshot()
    return {
        "snapshot_id": snapshot.snapshot_id,
        "timestamp": snapshot.timestamp,
        "nodes": snapshot.nodes,
        "edges": snapshot.edges,
        "active_pulses": snapshot.active_pulses,
        "recent_signals": snapshot.recent_signals,
        "global_activation": snapshot.global_activation,
        "total_signals": snapshot.total_signals,
        "stats": brain.neural_graph.get_stats(),
    }


# ========== Agent API ==========

@app.get("/api/agents")
async def list_agents():
    if not registry:
        raise HTTPException(503, "Agent registry not initialized")
    return registry.get_all_statuses()


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    if not registry:
        raise HTTPException(503, "Agent registry not initialized")

    agent = registry.get(agent_id)
    if not agent:
        raise HTTPException(404, f"Agent {agent_id} not found")

    return agent.get_status()


@app.post("/api/agents/{agent_id}/task")
async def assign_task_to_agent(agent_id: str, request: AgentTaskRequest):
    if not registry:
        raise HTTPException(503, "Agent registry not initialized")

    agent = registry.get(agent_id)
    if not agent:
        raise HTTPException(404, f"Agent {agent_id} not found")

    task = AgentTask(
        title=request.title,
        description=request.description,
        assigned_to=agent_id,
        priority=request.priority,
        context=request.context or {},
    )

    result = await agent.execute_task(task)
    return result


@app.post("/api/agents/dispatch")
async def dispatch_task(request: AgentTaskRequest):
    if not registry:
        raise HTTPException(503, "Agent registry not initialized")

    task = AgentTask(
        title=request.title,
        description=request.description,
        priority=request.priority,
        context=request.context or {},
    )

    role = None
    if request.agent_role:
        try:
            role = AgentRole(request.agent_role)
        except ValueError:
            pass

    result = await registry.dispatch_task(
        task=task,
        agent_id=request.agent_id,
        role=role,
    )
    return result


@app.get("/api/agents/network/graph")
async def agent_network_graph():
    if not registry:
        raise HTTPException(503, "Agent registry not initialized")
    return registry.get_network_graph()


# ========== Memory API ==========

@app.post("/api/memory/store")
async def store_memory(request: MemoryStoreRequest):
    if not memory:
        raise HTTPException(503, "Memory not initialized")

    try:
        mem_type = MemoryType(request.memory_type)
    except ValueError:
        mem_type = MemoryType.EPISODIC

    trace = await memory.remember(
        content=request.content,
        memory_type=mem_type,
        summary=request.summary,
        tags=request.tags,
        importance=request.importance,
        agent_id=request.agent_id,
    )

    return trace.to_dict()


@app.post("/api/memory/search")
async def search_memory(request: MemorySearchRequest):
    if not memory:
        raise HTTPException(503, "Memory not initialized")

    mem_types = None
    if request.memory_types:
        mem_types = [MemoryType(t) for t in request.memory_types if t in [m.value for m in MemoryType]]

    results = await memory.recall(
        query=request.query,
        memory_types=mem_types,
        limit=request.limit,
    )

    return [m.to_dict() for m in results]


@app.get("/api/memory/stats")
async def memory_stats():
    if not memory:
        raise HTTPException(503, "Memory not initialized")
    return memory.get_stats()


@app.post("/api/memory/consolidate")
async def consolidate_memory():
    if not memory:
        raise HTTPException(503, "Memory not initialized")
    result = await memory.consolidate()
    return result


# ========== Workflow API ==========

@app.get("/api/workflows")
async def list_workflows():
    if not workflow_engine:
        raise HTTPException(503, "Workflow engine not initialized")
    return workflow_engine.list_workflows()


@app.post("/api/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: WorkflowExecuteRequest):
    if not workflow_engine:
        raise HTTPException(503, "Workflow engine not initialized")

    if not workflow_engine.get_workflow(workflow_id):
        raise HTTPException(404, f"Workflow {workflow_id} not found")

    execution = await workflow_engine.execute(
        workflow_id=workflow_id,
        parameters=request.parameters,
        triggered_by=request.triggered_by,
    )

    return {
        "execution_id": execution.execution_id,
        "status": execution.status.value,
        "started_at": execution.started_at,
    }


@app.get("/api/workflows/executions/{execution_id}")
async def get_execution(execution_id: str):
    if not workflow_engine:
        raise HTTPException(503, "Workflow engine not initialized")

    execution = workflow_engine.get_execution(execution_id)
    if not execution:
        raise HTTPException(404, f"Execution {execution_id} not found")

    return {
        "execution_id": execution.execution_id,
        "workflow_id": execution.workflow_id,
        "workflow_name": execution.workflow_name,
        "status": execution.status.value,
        "progress": execution.progress,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "error": execution.error,
        "current_steps": execution.current_step_ids,
        "completed_steps": execution.completed_step_ids,
        "failed_steps": execution.failed_step_ids,
        "audit_log": execution.audit_log[-20:],  # Last 20 entries
    }


@app.get("/api/workflows/executions")
async def list_executions():
    if not workflow_engine:
        raise HTTPException(503, "Workflow engine not initialized")

    executions = workflow_engine.list_executions(limit=50)
    return [
        {
            "execution_id": e.execution_id,
            "workflow_name": e.workflow_name,
            "status": e.status.value,
            "progress": e.progress,
            "started_at": e.started_at,
        }
        for e in executions
    ]


# ========== Voice API ==========

@app.post("/api/voice/text")
async def voice_text_input(data: Dict[str, Any]):
    if not voice:
        raise HTTPException(503, "Voice system not initialized")

    text = data.get("text", "")
    session_id = data.get("session_id")

    if not text:
        raise HTTPException(400, "Text input required")

    # Check for wake word or active session
    has_session = session_id and voice.conversation.get_session(session_id)
    is_wake_word = await voice.wake_word_detector.detect_in_text(text)

    if not has_session and not is_wake_word:
        return {"response": "", "requires_wake_word": True}

    if not has_session:
        session = await voice.start_session()
        session_id = session.session_id

    response_text = await voice._generate_response(text, session_id)

    if session_id:
        voice.conversation.add_turn(session_id, text, response_text)

    return {
        "transcription": text,
        "response": response_text,
        "session_id": session_id,
    }


@app.get("/api/voice/status")
async def voice_status():
    if not voice:
        raise HTTPException(503, "Voice system not initialized")
    return voice.get_status()


# ========== WebSocket Real-time API ==========

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    Real-time WebSocket endpoint for:
    - Neural graph streaming
    - Agent state updates
    - Live workflow progress
    - Voice streaming
    - Chat interface
    """
    await ws_manager.connect(websocket, client_id)
    logger.info("WebSocket connected", client_id=client_id)

    # Start neural graph streaming task
    graph_task = asyncio.create_task(
        stream_neural_graph_to_client(client_id)
    )

    try:
        while True:
            data = await websocket.receive_json()
            await handle_ws_message(client_id, data, websocket)

    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        graph_task.cancel()
        logger.info("WebSocket disconnected", client_id=client_id)
    except Exception as e:
        ws_manager.disconnect(client_id)
        graph_task.cancel()
        logger.error("WebSocket error", client_id=client_id, error=str(e))


async def handle_ws_message(
    client_id: str,
    data: Dict[str, Any],
    websocket: WebSocket,
):
    """Handle incoming WebSocket messages."""
    msg_type = data.get("type", "")

    if msg_type == "think":
        if brain:
            result = await brain.think(
                input_text=data.get("input", ""),
                context=data.get("context"),
            )
            await ws_manager.send(client_id, {
                "type": "think_result",
                "data": result,
                "request_id": data.get("request_id"),
            })

    elif msg_type == "agent_task":
        if registry:
            task = AgentTask(
                title=data.get("title", ""),
                description=data.get("description", ""),
                context=data.get("context", {}),
            )
            agent_id = data.get("agent_id")
            agent = registry.get(agent_id) if agent_id else registry.get_by_role(AgentRole.CEO)
            if agent:
                result = await agent.execute_task(task)
                await ws_manager.send(client_id, {
                    "type": "task_result",
                    "data": result,
                    "request_id": data.get("request_id"),
                })

    elif msg_type == "voice":
        if voice:
            text = data.get("text", "")
            session_id = data.get("session_id")
            response = await voice._generate_response(text, session_id or "")
            await ws_manager.send(client_id, {
                "type": "voice_response",
                "text": response,
                "session_id": session_id,
            })

    elif msg_type == "subscribe_neural_graph":
        # Client explicitly requesting graph updates
        await ws_manager.send(client_id, {
            "type": "subscribed",
            "channel": "neural_graph",
        })

    elif msg_type == "ping":
        await ws_manager.send(client_id, {"type": "pong", "timestamp": time.time()})


async def stream_neural_graph_to_client(client_id: str):
    """Stream neural graph updates to a specific client."""
    while True:
        await asyncio.sleep(0.5)  # 2 FPS

        if brain and client_id in ws_manager._connections:
            try:
                snapshot = brain.neural_graph.get_snapshot()
                await ws_manager.send(client_id, {
                    "type": "neural_graph_update",
                    "data": {
                        "nodes": snapshot.nodes,
                        "edges": snapshot.edges,
                        "active_pulses": snapshot.active_pulses,
                        "recent_signals": snapshot.recent_signals[-10:],
                        "global_activation": snapshot.global_activation,
                        "total_signals": snapshot.total_signals,
                        "timestamp": snapshot.timestamp,
                    },
                })
            except Exception:
                break


# ========== Business Operations API ==========

@app.post("/api/business/analyze")
async def analyze_business(data: Dict[str, Any]):
    """Comprehensive business analysis by CEO + CFO agents."""
    if not registry:
        raise HTTPException(503, "Registry not initialized")

    ceo = registry.get_by_role(AgentRole.CEO)
    cfo = registry.get_by_role(AgentRole.CFO)

    results = {}

    if ceo:
        task = AgentTask(
            title="Business Analysis",
            description=f"Analyze: {data.get('description', 'General business analysis')}",
            context=data,
        )
        results["strategic"] = await ceo.execute_task(task)

    if cfo:
        task = AgentTask(
            title="Financial Analysis",
            description="Analyze financial aspects",
            context=data,
        )
        results["financial"] = await cfo.execute_task(task)

    return results


@app.post("/api/business/build-saas")
async def build_saas_company(data: Dict[str, Any]):
    """Autonomous SaaS company building pipeline."""
    if not registry:
        raise HTTPException(503, "Registry not initialized")

    idea = data.get("idea", "")
    results = {}

    # Research phase
    research_agent = registry.get_by_role(AgentRole.RESEARCH)
    if research_agent:
        task = AgentTask(
            title="Market Research",
            description=f"Research market for: {idea}",
            context={"idea": idea},
        )
        results["research"] = await research_agent.execute_task(task)

    # Product phase
    product_agent = registry.get_by_role(AgentRole.PRODUCT)
    if product_agent:
        task = AgentTask(
            title="Product Strategy",
            description=f"Create product strategy for: {idea}",
            context={"idea": idea, "research": results.get("research", {})},
        )
        results["product"] = await product_agent.execute_task(task)

    # Technical architecture
    cto = registry.get_by_role(AgentRole.CTO)
    if cto:
        task = AgentTask(
            title="Technical Architecture",
            description=f"Design technical architecture for: {idea}",
            context={"idea": idea, "product": results.get("product", {})},
        )
        results["architecture"] = await cto.execute_task(task)

    # Marketing strategy
    cmo = registry.get_by_role(AgentRole.CMO)
    if cmo:
        task = AgentTask(
            title="Marketing Strategy",
            description=f"Create go-to-market strategy for: {idea}",
            context={"idea": idea},
        )
        results["marketing"] = await cmo.execute_task(task)

    # Financial projections
    cfo = registry.get_by_role(AgentRole.CFO)
    if cfo:
        task = AgentTask(
            title="Financial Projections",
            description=f"Create financial model for: {idea}",
            context={"idea": idea, "product": results.get("product", {})},
        )
        results["financials"] = await cfo.execute_task(task)

    return {
        "idea": idea,
        "phases": results,
        "status": "analysis_complete",
        "timestamp": time.time(),
    }


# ========== Software Factory API ==========

@app.post("/api/software/generate")
async def generate_software(data: Dict[str, Any]):
    """Generate software from specification."""
    if not registry:
        raise HTTPException(503, "Registry not initialized")

    cto = registry.get_by_role(AgentRole.CTO)
    if not cto:
        raise HTTPException(503, "CTO agent not available")

    task = AgentTask(
        title="Software Generation",
        description=data.get("specification", ""),
        context=data,
    )

    result = await cto.execute_task(task)
    return result


# ========== Research API ==========

@app.post("/api/research/market")
async def research_market(data: Dict[str, Any]):
    if not registry:
        raise HTTPException(503, "Registry not initialized")

    research_agent = registry.get_by_role(AgentRole.RESEARCH)
    if not research_agent:
        raise HTTPException(503, "Research agent not available")

    task = AgentTask(
        title="Market Research",
        description=f"Research: {data.get('query', '')}",
        context=data,
    )

    result = await research_agent.execute_task(task)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
