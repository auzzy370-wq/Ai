"""
Base Agent - Foundation for all JARVIS AI agents.

Each agent represents a specialized executive function,
modeled after C-suite roles with full autonomous capabilities.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional, Set, Tuple

import structlog

from ..memory.memory_system import MemorySystem, MemoryTrace, MemoryType

logger = structlog.get_logger(__name__)


class AgentState(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    PLANNING = "planning"
    EXECUTING = "executing"
    WAITING = "waiting"
    ERROR = "error"
    OFFLINE = "offline"


class AgentRole(str, Enum):
    CEO = "ceo"
    COO = "coo"
    CTO = "cto"
    CFO = "cfo"
    CMO = "cmo"
    SALES = "sales"
    RESEARCH = "research"
    SUPPORT = "support"
    LEGAL = "legal"
    HR = "hr"
    DATA_SCIENCE = "data_science"
    INVESTMENT = "investment"
    OPERATIONS = "operations"
    PRODUCT = "product"


class MessageType(str, Enum):
    TASK = "task"
    QUERY = "query"
    REPORT = "report"
    ALERT = "alert"
    APPROVAL_REQUEST = "approval_request"
    APPROVAL_RESPONSE = "approval_response"
    COLLABORATION = "collaboration"
    FEEDBACK = "feedback"


@dataclass
class AgentMessage:
    """Message passed between agents."""
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str = ""
    receiver_id: str = ""
    message_type: MessageType = MessageType.TASK
    subject: str = ""
    content: Any = None
    priority: float = 0.5
    requires_response: bool = False
    response_deadline: Optional[float] = None
    parent_message_id: Optional[str] = None
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentTask:
    """A task assigned to an agent."""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    assigned_to: str = ""
    assigned_by: str = ""
    priority: float = 0.5
    status: str = "pending"
    due_date: Optional[float] = None
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    subtasks: List["AgentTask"] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Any] = None
    error: Optional[str] = None
    progress: float = 0.0  # 0.0 to 1.0


@dataclass
class AgentGoal:
    """A goal the agent is working towards."""
    goal_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    success_criteria: List[str] = field(default_factory=list)
    priority: float = 0.5
    deadline: Optional[float] = None
    progress: float = 0.0
    status: str = "active"
    created_at: float = field(default_factory=time.time)
    sub_goals: List["AgentGoal"] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentMetrics:
    """Performance metrics for an agent."""
    tasks_completed: int = 0
    tasks_failed: int = 0
    total_processing_time: float = 0.0
    messages_sent: int = 0
    messages_received: int = 0
    decisions_made: int = 0
    memories_created: int = 0
    avg_response_time: float = 0.0
    success_rate: float = 1.0
    uptime_seconds: float = 0.0
    last_active: Optional[float] = None


class AgentTool:
    """A tool available to an agent."""

    def __init__(
        self,
        name: str,
        description: str,
        function: Callable,
        parameters: Optional[Dict[str, Any]] = None,
        requires_approval: bool = False,
    ):
        self.name = name
        self.description = description
        self.function = function
        self.parameters = parameters or {}
        self.requires_approval = requires_approval
        self.call_count = 0
        self.error_count = 0

    async def execute(self, **kwargs) -> Any:
        """Execute the tool with given parameters."""
        self.call_count += 1
        try:
            if asyncio.iscoroutinefunction(self.function):
                return await self.function(**kwargs)
            else:
                return self.function(**kwargs)
        except Exception as e:
            self.error_count += 1
            raise

    def to_langchain_tool(self) -> Dict[str, Any]:
        """Convert to LangChain tool format."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }


class BaseAgent(ABC):
    """
    Abstract base class for all JARVIS agents.
    
    Each agent is an autonomous executive function with:
    - Persistent memory across sessions
    - Goal tracking and planning
    - Tool usage capabilities
    - Inter-agent communication
    - Self-evaluation and reflection
    - Streaming response generation
    """

    def __init__(
        self,
        agent_id: str,
        name: str,
        role: AgentRole,
        description: str,
        memory_system: MemorySystem,
        llm_model: str = "gpt-4o",
    ):
        self.agent_id = agent_id
        self.name = name
        self.role = role
        self.description = description
        self.memory = memory_system
        self.llm_model = llm_model

        self.state = AgentState.IDLE
        self.goals: List[AgentGoal] = []
        self.active_tasks: List[AgentTask] = []
        self.completed_tasks: List[AgentTask] = []
        self.tools: Dict[str, AgentTool] = {}
        self.metrics = AgentMetrics()

        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._message_handlers: Dict[MessageType, List[Callable]] = {
            msg_type: [] for msg_type in MessageType
        }
        self._collaboration_agents: Dict[str, "BaseAgent"] = {}
        self._event_handlers: Dict[str, List[Callable]] = {}
        self._running = False
        self._start_time = time.time()

        self.logger = structlog.get_logger(name)
        self._initialize_core_tools()

    def _initialize_core_tools(self):
        """Register tools available to all agents."""
        self.register_tool(AgentTool(
            name="remember",
            description="Store information in long-term memory",
            function=self._tool_remember,
        ))
        self.register_tool(AgentTool(
            name="recall",
            description="Retrieve relevant memories",
            function=self._tool_recall,
        ))
        self.register_tool(AgentTool(
            name="send_message",
            description="Send a message to another agent",
            function=self._tool_send_message,
        ))
        self.register_tool(AgentTool(
            name="create_task",
            description="Create and assign a task",
            function=self._tool_create_task,
        ))

    def register_tool(self, tool: AgentTool):
        """Register a tool with this agent."""
        self.tools[tool.name] = tool

    async def _tool_remember(self, content: Any, summary: str = "", importance: float = 0.5) -> str:
        trace = await self.memory.remember(
            content=content,
            summary=summary,
            importance=importance,
            agent_id=self.agent_id,
        )
        self.metrics.memories_created += 1
        return trace.memory_id

    async def _tool_recall(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        memories = await self.memory.recall(
            query=query,
            agent_id=self.agent_id,
            limit=limit,
        )
        return [m.to_dict() for m in memories]

    async def _tool_send_message(
        self,
        receiver_id: str,
        content: Any,
        message_type: str = "task",
    ) -> str:
        msg = AgentMessage(
            sender_id=self.agent_id,
            receiver_id=receiver_id,
            message_type=MessageType(message_type),
            content=content,
        )
        if receiver_id in self._collaboration_agents:
            await self._collaboration_agents[receiver_id].receive_message(msg)
        self.metrics.messages_sent += 1
        return msg.message_id

    async def _tool_create_task(
        self,
        title: str,
        description: str,
        assigned_to: Optional[str] = None,
        priority: float = 0.5,
    ) -> str:
        task = AgentTask(
            title=title,
            description=description,
            assigned_to=assigned_to or self.agent_id,
            assigned_by=self.agent_id,
            priority=priority,
        )
        self.active_tasks.append(task)
        return task.task_id

    def add_collaborator(self, agent: "BaseAgent"):
        """Register another agent for collaboration."""
        self._collaboration_agents[agent.agent_id] = agent

    async def receive_message(self, message: AgentMessage):
        """Receive a message from another agent."""
        await self._message_queue.put(message)
        self.metrics.messages_received += 1

    def set_goal(self, goal: AgentGoal):
        """Set a new goal for this agent."""
        self.goals.append(goal)
        self.logger.info("New goal set", goal=goal.title)

    async def start(self):
        """Start the agent's processing loop."""
        self._running = True
        self.state = AgentState.IDLE
        self.logger.info(f"{self.name} started")

        asyncio.create_task(self._message_processing_loop())
        asyncio.create_task(self._goal_monitoring_loop())
        asyncio.create_task(self._self_reflection_loop())

    async def stop(self):
        """Stop the agent."""
        self._running = False
        self.state = AgentState.OFFLINE
        self.logger.info(f"{self.name} stopped")

    async def _message_processing_loop(self):
        """Process incoming messages."""
        while self._running:
            try:
                message = await asyncio.wait_for(
                    self._message_queue.get(),
                    timeout=1.0,
                )
                await self._handle_message(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error("Message processing error", error=str(e))

    async def _handle_message(self, message: AgentMessage):
        """Route message to appropriate handler."""
        handlers = self._message_handlers.get(message.message_type, [])
        for handler in handlers:
            try:
                await handler(message)
            except Exception as e:
                self.logger.error("Message handler error", error=str(e))

    async def _goal_monitoring_loop(self):
        """Monitor and update goal progress."""
        while self._running:
            await asyncio.sleep(30)
            for goal in self.goals:
                if goal.status == "active":
                    await self._evaluate_goal_progress(goal)

    async def _evaluate_goal_progress(self, goal: AgentGoal):
        """Evaluate progress towards a goal."""
        completed_related = sum(
            1 for task in self.completed_tasks
            if goal.goal_id in task.context.get("goal_ids", [])
        )
        total_related = sum(
            1 for task in (self.active_tasks + self.completed_tasks)
            if goal.goal_id in task.context.get("goal_ids", [])
        )

        if total_related > 0:
            goal.progress = completed_related / total_related
            if goal.progress >= 1.0:
                goal.status = "completed"
                self.logger.info("Goal completed", goal=goal.title)

    async def _self_reflection_loop(self):
        """Periodic self-evaluation and learning."""
        while self._running:
            await asyncio.sleep(60)
            await self._reflect()

    async def _reflect(self):
        """
        Self-reflection: evaluate recent performance,
        update strategies, consolidate learnings.
        """
        if not self.completed_tasks:
            return

        recent = self.completed_tasks[-10:]
        successes = sum(1 for t in recent if t.status == "completed" and not t.error)
        failures = sum(1 for t in recent if t.error)

        if failures > successes * 0.3:
            self.logger.warning(
                "High failure rate detected in self-reflection",
                successes=successes,
                failures=failures,
            )

        # Update success rate metric
        total = self.metrics.tasks_completed + self.metrics.tasks_failed
        if total > 0:
            self.metrics.success_rate = self.metrics.tasks_completed / total

    async def think(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Core reasoning function - uses LLM for complex reasoning.
        Override in subclasses for specialized behavior.
        """
        self.state = AgentState.THINKING
        self.metrics.decisions_made += 1
        self.metrics.last_active = time.time()

        # Retrieve relevant memories
        memories = await self.memory.recall(query=prompt, agent_id=self.agent_id, limit=5)
        memory_context = [m.summary for m in memories]

        result = await self._execute_reasoning(prompt, context, memory_context)

        self.state = AgentState.IDLE
        return result

    @abstractmethod
    async def _execute_reasoning(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]],
        memory_context: List[str],
    ) -> str:
        """Implement actual LLM reasoning in subclasses."""
        ...

    @abstractmethod
    async def execute_task(self, task: AgentTask) -> Dict[str, Any]:
        """Execute a specific task. Implement in subclasses."""
        ...

    async def stream_response(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a response token by token."""
        response = await self.think(prompt, context)
        # Simulate streaming
        words = response.split()
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.02)

    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive agent status."""
        uptime = time.time() - self._start_time
        self.metrics.uptime_seconds = uptime

        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "role": self.role.value,
            "description": self.description,
            "state": self.state.value,
            "goals": [
                {
                    "id": g.goal_id,
                    "title": g.title,
                    "progress": g.progress,
                    "status": g.status,
                }
                for g in self.goals
            ],
            "active_tasks": len(self.active_tasks),
            "completed_tasks": len(self.completed_tasks),
            "tools": list(self.tools.keys()),
            "metrics": {
                "tasks_completed": self.metrics.tasks_completed,
                "tasks_failed": self.metrics.tasks_failed,
                "messages_sent": self.metrics.messages_sent,
                "messages_received": self.metrics.messages_received,
                "decisions_made": self.metrics.decisions_made,
                "success_rate": self.metrics.success_rate,
                "uptime_seconds": uptime,
                "last_active": self.metrics.last_active,
            },
            "collaborators": list(self._collaboration_agents.keys()),
        }
