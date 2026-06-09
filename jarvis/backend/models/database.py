"""
Database models for JARVIS Neural Enterprise OS.
SQLAlchemy async models with full schema.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    """System user with RBAC."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="user")  # admin, user, viewer
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    permissions = Column(JSONB, default=list)
    settings = Column(JSONB, default=dict)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Organization(Base):
    """Organization/company managed by JARVIS."""
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    industry = Column(String(100))
    website = Column(String(500))
    stage = Column(String(50))  # idea, startup, growth, enterprise
    metrics = Column(JSONB, default=dict)  # MRR, ARR, etc.
    settings = Column(JSONB, default=dict)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class MemoryRecord(Base):
    """Persistent memory storage."""
    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    memory_type = Column(String(50), nullable=False, index=True)
    content = Column(JSONB, nullable=False)
    summary = Column(Text)
    tags = Column(ARRAY(String), default=list, index=True)
    source = Column(String(100))
    importance = Column(Float, default=0.5)
    confidence = Column(Float, default=1.0)
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime)
    expires_at = Column(DateTime)
    status = Column(String(50), default="active")
    associations = Column(ARRAY(UUID), default=list)
    embedding = Column(JSONB)  # Vector stored as JSON (use pgvector in prod)
    context = Column(JSONB, default=dict)
    agent_id = Column(String(100), index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_memories_type_importance", "memory_type", "importance"),
        Index("idx_memories_agent_type", "agent_id", "memory_type"),
    )


class AgentRecord(Base):
    """Agent state persistence."""
    __tablename__ = "agents"

    id = Column(String(100), primary_key=True)  # agent_id
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    description = Column(Text)
    state = Column(String(50), default="idle")
    goals = Column(JSONB, default=list)
    metrics = Column(JSONB, default=dict)
    settings = Column(JSONB, default=dict)
    is_active = Column(Boolean, default=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class TaskRecord(Base):
    """Task execution history."""
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    assigned_to = Column(String(100), index=True)
    assigned_by = Column(String(100))
    status = Column(String(50), default="pending", index=True)
    priority = Column(Float, default=0.5)
    due_date = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    result = Column(JSONB)
    error = Column(Text)
    context = Column(JSONB, default=dict)
    progress = Column(Float, default=0.0)
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"))
    workflow_execution_id = Column(UUID(as_uuid=True))
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        Index("idx_tasks_agent_status", "assigned_to", "status"),
    )


class WorkflowRecord(Base):
    """Workflow definitions."""
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    version = Column(String(50), default="1.0.0")
    definition = Column(JSONB, nullable=False)  # Full workflow JSON
    category = Column(String(100), default="general")
    tags = Column(ARRAY(String), default=list)
    is_template = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    triggers = Column(JSONB, default=list)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class WorkflowExecutionRecord(Base):
    """Workflow execution history."""
    __tablename__ = "workflow_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"), index=True)
    workflow_name = Column(String(255))
    status = Column(String(50), default="pending", index=True)
    triggered_by = Column(String(100))
    trigger_type = Column(String(50))
    input_parameters = Column(JSONB, default=dict)
    variables = Column(JSONB, default=dict)
    result = Column(JSONB)
    error = Column(Text)
    progress = Column(Float, default=0.0)
    audit_log = Column(JSONB, default=list)
    step_states = Column(JSONB, default=dict)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=func.now())


class ConversationRecord(Base):
    """Voice and chat conversation history."""
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(100), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    channel = Column(String(50), default="chat")  # chat, voice, api
    turns = Column(JSONB, default=list)
    context = Column(JSONB, default=dict)
    summary = Column(Text)
    sentiment = Column(String(50))
    is_active = Column(Boolean, default=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=func.now())
    last_activity = Column(DateTime, default=func.now())


class CustomerRecord(Base):
    """CRM customer records."""
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), index=True)
    phone = Column(String(50))
    company = Column(String(255))
    stage = Column(String(50), default="lead")  # lead, prospect, customer, churned
    score = Column(Float, default=0.0)
    tags = Column(ARRAY(String), default=list)
    ltv = Column(Float, default=0.0)  # Lifetime value
    mrr = Column(Float, default=0.0)  # Monthly recurring revenue
    source = Column(String(100))
    notes = Column(Text)
    attributes = Column(JSONB, default=dict)
    interactions = Column(JSONB, default=list)
    assigned_to = Column(String(100))
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_customers_org_stage", "organization_id", "stage"),
    )


class FinancialRecord(Base):
    """Financial transactions and metrics."""
    __tablename__ = "financial_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_type = Column(String(50), nullable=False, index=True)  # revenue, expense, investment
    category = Column(String(100), index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    description = Column(Text)
    reference_id = Column(String(255))  # External transaction ID
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"))
    metadata = Column(JSONB, default=dict)
    recorded_at = Column(DateTime, default=func.now())
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), index=True)
    created_at = Column(DateTime, default=func.now())


class ProjectRecord(Base):
    """Project management."""
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="active", index=True)
    priority = Column(String(50), default="medium")
    owner_agent = Column(String(100))
    team_agents = Column(ARRAY(String), default=list)
    start_date = Column(DateTime)
    due_date = Column(DateTime)
    completed_at = Column(DateTime)
    progress = Column(Float, default=0.0)
    budget = Column(Float)
    budget_spent = Column(Float, default=0.0)
    tags = Column(ARRAY(String), default=list)
    metadata = Column(JSONB, default=dict)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class AuditLog(Base):
    """System-wide audit logging."""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), nullable=False, index=True)
    actor_id = Column(String(100), index=True)  # user_id or agent_id
    actor_type = Column(String(50))  # user, agent, system
    resource_type = Column(String(100))
    resource_id = Column(String(100))
    action = Column(String(100))
    details = Column(JSONB, default=dict)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    severity = Column(String(50), default="info")
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    timestamp = Column(DateTime, default=func.now(), index=True)

    __table_args__ = (
        Index("idx_audit_event_time", "event_type", "timestamp"),
    )


class MarketingCampaign(Base):
    """Marketing campaigns."""
    __tablename__ = "marketing_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(String(50))  # email, social, paid, content
    status = Column(String(50), default="draft")
    platform = Column(String(100))  # google, meta, tiktok, etc.
    budget = Column(Float)
    budget_spent = Column(Float, default=0.0)
    target_audience = Column(JSONB, default=dict)
    objectives = Column(ARRAY(String), default=list)
    content = Column(JSONB, default=dict)  # Ads, copy, creatives
    metrics = Column(JSONB, default=dict)  # Impressions, clicks, conversions
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    created_by = Column(String(100))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class NeuralGraphSnapshot(Base):
    """Snapshots of neural graph state for analysis."""
    __tablename__ = "neural_graph_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_count = Column(Integer)
    edge_count = Column(Integer)
    active_nodes = Column(Integer)
    total_signals = Column(Integer)
    global_activation = Column(Float)
    node_activations = Column(JSONB)  # Compressed activation data
    signal_patterns = Column(JSONB)   # Signal patterns for analysis
    timestamp = Column(DateTime, default=func.now(), index=True)


# Database configuration

def get_database_url(
    host: str = "localhost",
    port: int = 5432,
    database: str = "jarvis",
    username: str = "jarvis",
    password: str = "jarvis_secret",
) -> str:
    return f"postgresql+asyncpg://{username}:{password}@{host}:{port}/{database}"


async def create_db_engine(database_url: str):
    """Create async database engine."""
    from sqlalchemy.ext.asyncio import create_async_engine
    engine = create_async_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=40,
    )
    return engine


async def init_db(engine):
    """Initialize database schema."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
