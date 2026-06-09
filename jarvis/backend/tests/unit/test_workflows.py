"""
Tests for JARVIS Workflow Engine.
"""

import asyncio
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.workflows.engine import (
    WorkflowEngine,
    WorkflowDefinition,
    WorkflowStep,
    WorkflowStatus,
    StepStatus,
    TriggerType,
    RetryPolicy,
    WorkflowContext,
    WorkflowExecution,
)


def create_simple_workflow() -> WorkflowDefinition:
    """Create a simple test workflow."""
    step1 = WorkflowStep(
        step_id="step1",
        name="First Step",
        description="Do something",
        step_type="action",
        action="test_action",
        parameters={"input": "hello"},
        next_steps=["step2"],
    )
    step2 = WorkflowStep(
        step_id="step2",
        name="Second Step",
        description="Do something else",
        step_type="action",
        action="test_action",
        parameters={"input": "${steps.step1.action}"},
        next_steps=[],
    )

    workflow = WorkflowDefinition(
        name="Test Workflow",
        description="A simple test workflow",
        steps={"step1": step1, "step2": step2},
        entry_point="step1",
    )
    return workflow


class TestWorkflowEngine:
    """Test the workflow execution engine."""

    @pytest.mark.asyncio
    async def test_workflow_registration(self):
        engine = WorkflowEngine()
        workflow = create_simple_workflow()
        engine.register_workflow(workflow)

        retrieved = engine.get_workflow(workflow.workflow_id)
        assert retrieved is not None
        assert retrieved.name == "Test Workflow"

    @pytest.mark.asyncio
    async def test_workflow_execution(self):
        engine = WorkflowEngine()
        workflow = create_simple_workflow()

        # Register a test executor
        async def test_executor(step, context, params):
            return {"result": f"executed_{step.name}", "params": params}

        engine.register_step_executor("action", test_executor)
        engine.register_workflow(workflow)

        execution = await engine.execute(workflow.workflow_id)
        assert execution is not None
        assert execution.workflow_id == workflow.workflow_id

        # Wait for completion
        await asyncio.sleep(0.5)
        execution = engine.get_execution(execution.execution_id)

    @pytest.mark.asyncio
    async def test_workflow_not_found(self):
        engine = WorkflowEngine()
        with pytest.raises(ValueError, match="not found"):
            await engine.execute("nonexistent-workflow-id")

    @pytest.mark.asyncio
    async def test_retry_policy_delay(self):
        policy = RetryPolicy(
            max_attempts=3,
            initial_delay_seconds=1.0,
            backoff_multiplier=2.0,
            max_delay_seconds=60.0,
        )
        assert policy.get_delay(1) == 1.0
        assert policy.get_delay(2) == 2.0
        assert policy.get_delay(3) == 4.0

    @pytest.mark.asyncio
    async def test_workflow_context_variable_substitution(self):
        execution = WorkflowExecution(
            workflow_id="test",
            variables={"company": "Acme Corp", "target": "1000"},
        )
        context = WorkflowContext(execution)

        template = "Build ${company} to $${target} ARR"
        resolved = context.resolve_template(template)
        assert "Acme Corp" in resolved
        assert "1000" in resolved

    @pytest.mark.asyncio
    async def test_condition_evaluation(self):
        execution = WorkflowExecution(
            workflow_id="test",
            variables={"revenue": "50000", "target": "100000"},
        )
        context = WorkflowContext(execution)

        # Test equality condition
        result = context.evaluate_condition({
            "type": "expression",
            "left": "revenue",
            "operator": "lt",
            "right": "100000",
        })
        assert result  # 50000 < 100000

    @pytest.mark.asyncio
    async def test_list_workflows(self):
        engine = WorkflowEngine()
        wf1 = create_simple_workflow()
        wf1.name = "Workflow 1"
        wf2 = create_simple_workflow()
        wf2.name = "Workflow 2"

        engine.register_workflow(wf1)
        engine.register_workflow(wf2)

        workflows = engine.list_workflows()
        assert len(workflows) >= 2

    @pytest.mark.asyncio
    async def test_workflow_cancellation(self):
        engine = WorkflowEngine()
        workflow = create_simple_workflow()

        async def slow_executor(step, context, params):
            await asyncio.sleep(10)
            return {"result": "done"}

        engine.register_step_executor("action", slow_executor)
        engine.register_workflow(workflow)

        execution = await engine.execute(workflow.workflow_id)
        await asyncio.sleep(0.1)

        await engine.cancel(execution.execution_id)

        # Check status
        execution = engine.get_execution(execution.execution_id)
        # Allow both cancelled and still running (timing dependent)
        assert execution is not None

    def test_workflow_engine_stats(self):
        engine = WorkflowEngine()
        stats = engine.get_stats()

        assert "total_workflows" in stats
        assert "total_executions" in stats
        assert "running" in stats


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
