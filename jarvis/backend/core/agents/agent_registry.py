"""
Agent Registry - Central management for all JARVIS agents.
Handles agent lifecycle, communication routing, and orchestration.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional, Type

import structlog

from ..memory.memory_system import MemorySystem
from .base_agent import AgentMessage, AgentRole, AgentState, AgentTask, BaseAgent

logger = structlog.get_logger(__name__)


class AgentRegistry:
    """
    Central registry and coordinator for all agents.
    
    Functions as the organizational hierarchy:
    - CEO agent at the top, delegating to specialized agents
    - Routes messages between agents
    - Monitors agent health
    - Orchestrates multi-agent workflows
    """

    def __init__(self, memory_system: MemorySystem):
        self._agents: Dict[str, BaseAgent] = {}
        self._role_map: Dict[AgentRole, str] = {}  # role -> agent_id
        self._memory = memory_system
        self._message_bus: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._routing_rules: Dict[str, str] = {}

    def register(self, agent: BaseAgent):
        """Register an agent with the registry."""
        self._agents[agent.agent_id] = agent
        self._role_map[agent.role] = agent.agent_id

        # Wire all agents together for collaboration
        for existing_agent in self._agents.values():
            if existing_agent.agent_id != agent.agent_id:
                existing_agent.add_collaborator(agent)
                agent.add_collaborator(existing_agent)

        logger.info(
            "Agent registered",
            agent_id=agent.agent_id,
            name=agent.name,
            role=agent.role.value,
        )

    def get(self, agent_id: str) -> Optional[BaseAgent]:
        """Get an agent by ID."""
        return self._agents.get(agent_id)

    def get_by_role(self, role: AgentRole) -> Optional[BaseAgent]:
        """Get the agent assigned to a role."""
        agent_id = self._role_map.get(role)
        if agent_id:
            return self._agents.get(agent_id)
        return None

    async def start_all(self):
        """Start all registered agents."""
        self._running = True
        tasks = []
        for agent in self._agents.values():
            tasks.append(agent.start())

        await asyncio.gather(*tasks, return_exceptions=True)
        asyncio.create_task(self._message_routing_loop())
        asyncio.create_task(self._health_monitoring_loop())
        logger.info(f"Started {len(self._agents)} agents")

    async def stop_all(self):
        """Stop all agents gracefully."""
        self._running = False
        tasks = [agent.stop() for agent in self._agents.values()]
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("All agents stopped")

    async def dispatch_task(
        self,
        task: AgentTask,
        agent_id: Optional[str] = None,
        role: Optional[AgentRole] = None,
    ) -> Dict[str, Any]:
        """Dispatch a task to a specific agent or role."""
        target_agent = None

        if agent_id:
            target_agent = self._agents.get(agent_id)
        elif role:
            target_agent = self.get_by_role(role)

        if not target_agent:
            # Route to CEO for orchestration
            target_agent = self.get_by_role(AgentRole.CEO)

        if not target_agent:
            return {"error": "No suitable agent found for task"}

        result = await target_agent.execute_task(task)
        return result

    async def broadcast_message(
        self,
        message: AgentMessage,
        exclude_ids: Optional[List[str]] = None,
    ):
        """Broadcast a message to all agents."""
        exclude = set(exclude_ids or [])
        tasks = []

        for agent in self._agents.values():
            if agent.agent_id not in exclude:
                tasks.append(agent.receive_message(AgentMessage(
                    sender_id=message.sender_id,
                    receiver_id=agent.agent_id,
                    message_type=message.message_type,
                    subject=message.subject,
                    content=message.content,
                    priority=message.priority,
                )))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def route_message(self, message: AgentMessage) -> bool:
        """Route a message to the appropriate agent."""
        target = self._agents.get(message.receiver_id)

        if not target and message.receiver_id in self._role_map.values():
            target = self._agents.get(message.receiver_id)

        if not target:
            # Try routing by role
            for role, agent_id in self._role_map.items():
                if role.value == message.receiver_id:
                    target = self._agents.get(agent_id)
                    break

        if target:
            await target.receive_message(message)
            return True

        logger.warning("Message routing failed", receiver=message.receiver_id)
        return False

    async def _message_routing_loop(self):
        """Process and route messages from the message bus."""
        while self._running:
            try:
                message = await asyncio.wait_for(
                    self._message_bus.get(),
                    timeout=0.1,
                )
                await self.route_message(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error("Message routing error", error=str(e))

    async def _health_monitoring_loop(self):
        """Monitor agent health and restart failed agents."""
        while self._running:
            await asyncio.sleep(30)
            for agent in self._agents.values():
                if agent.state == AgentState.ERROR:
                    logger.warning(
                        "Agent in error state, attempting recovery",
                        agent_id=agent.agent_id,
                        name=agent.name,
                    )
                    await agent.stop()
                    await asyncio.sleep(1)
                    await agent.start()

    def get_all_statuses(self) -> Dict[str, Any]:
        """Get status of all agents."""
        return {
            agent_id: agent.get_status()
            for agent_id, agent in self._agents.items()
        }

    def get_network_graph(self) -> Dict[str, Any]:
        """Get the agent communication network as a graph."""
        nodes = []
        edges = []

        for agent in self._agents.values():
            nodes.append({
                "id": agent.agent_id,
                "name": agent.name,
                "role": agent.role.value,
                "state": agent.state.value,
            })

            for collaborator_id in agent._collaboration_agents:
                edges.append({
                    "source": agent.agent_id,
                    "target": collaborator_id,
                })

        return {"nodes": nodes, "edges": edges}
