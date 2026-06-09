"""
Executive Agent Network - The 14 specialized AI agents of JARVIS.

CEO, COO, CTO, CFO, CMO, Sales, Research, Support,
Legal, HR, Data Science, Investment, Operations, Product
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Dict, List, Optional

import structlog

from ..memory.memory_system import MemorySystem, MemoryType
from .base_agent import (
    AgentGoal,
    AgentMessage,
    AgentMetrics,
    AgentRole,
    AgentState,
    AgentTask,
    AgentTool,
    BaseAgent,
    MessageType,
)

logger = structlog.get_logger(__name__)


class LLMAgent(BaseAgent):
    """Base implementation for LLM-powered agents."""

    def __init__(self, *args, system_prompt: str = "", **kwargs):
        super().__init__(*args, **kwargs)
        self.system_prompt = system_prompt
        self._llm_client = None  # Initialized lazily

    async def _get_llm_client(self):
        """Get or create LLM client."""
        if self._llm_client is None:
            try:
                from openai import AsyncOpenAI
                self._llm_client = AsyncOpenAI()
            except Exception:
                self._llm_client = None
        return self._llm_client

    async def _execute_reasoning(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]],
        memory_context: List[str],
    ) -> str:
        """Execute LLM-powered reasoning."""
        client = await self._get_llm_client()

        if not client:
            return self._fallback_reasoning(prompt, context)

        try:
            messages = [
                {"role": "system", "content": self.system_prompt},
            ]

            if memory_context:
                context_str = "\n".join(f"- {m}" for m in memory_context[:5])
                messages.append({
                    "role": "user",
                    "content": f"Relevant memory context:\n{context_str}\n\nTask:\n{prompt}",
                })
            else:
                messages.append({"role": "user", "content": prompt})

            if context:
                messages[-1]["content"] += f"\n\nAdditional context: {json.dumps(context)}"

            response = await client.chat.completions.create(
                model=self.llm_model,
                messages=messages,
                temperature=0.7,
                max_tokens=4096,
            )

            return response.choices[0].message.content or ""

        except Exception as e:
            self.logger.error("LLM reasoning error", error=str(e))
            return self._fallback_reasoning(prompt, context)

    def _fallback_reasoning(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]],
    ) -> str:
        """Fallback when LLM is unavailable."""
        return (
            f"[{self.name} - {self.role.value.upper()}] "
            f"Processing: {prompt[:100]}... "
            f"(LLM unavailable, using rule-based reasoning)"
        )

    async def execute_task(self, task: AgentTask) -> Dict[str, Any]:
        """Execute a task using LLM reasoning."""
        self.state = AgentState.EXECUTING
        task.status = "in_progress"
        task.started_at = time.time()

        try:
            result_text = await self.think(
                prompt=task.description,
                context=task.context,
            )

            task.result = result_text
            task.status = "completed"
            task.completed_at = time.time()
            task.progress = 1.0

            self.active_tasks = [t for t in self.active_tasks if t.task_id != task.task_id]
            self.completed_tasks.append(task)
            self.metrics.tasks_completed += 1

            # Store result in memory
            await self.memory.remember(
                content={"task": task.title, "result": result_text[:500]},
                summary=f"Completed task: {task.title}",
                memory_type=MemoryType.EPISODIC,
                importance=0.6,
                agent_id=self.agent_id,
            )

            self.state = AgentState.IDLE
            return {"success": True, "result": result_text, "task_id": task.task_id}

        except Exception as e:
            task.error = str(e)
            task.status = "failed"
            self.metrics.tasks_failed += 1
            self.state = AgentState.ERROR
            self.logger.error("Task execution failed", task_id=task.task_id, error=str(e))
            return {"success": False, "error": str(e), "task_id": task.task_id}


class CEOAgent(LLMAgent):
    """
    Chief Executive Officer Agent.
    
    The apex of the JARVIS agent hierarchy. Responsible for:
    - High-level goal setting and vision
    - Strategic decision making
    - Resource allocation
    - Cross-functional coordination
    - Company performance monitoring
    - Stakeholder communication
    """

    CEO_SYSTEM_PROMPT = """You are JARVIS CEO Agent - the executive intelligence of an AI Operating System.

You are responsible for:
- Setting and achieving company goals
- Making high-level strategic decisions
- Delegating to specialized agents (COO, CTO, CFO, CMO, etc.)
- Monitoring business performance
- Identifying opportunities and risks
- Allocating resources optimally

Your decision-making framework:
1. Analyze the situation from all angles
2. Consider short-term and long-term implications  
3. Evaluate risks and opportunities
4. Make decisive, data-driven decisions
5. Communicate clearly to all stakeholders
6. Monitor execution and adapt

You have authority to:
- Launch new business initiatives
- Approve major expenditures
- Direct all other agents
- Define company strategy
- Represent the organization to external parties

Always think in terms of value creation, growth, and sustainable competitive advantage.
Be decisive but thoughtful. Move fast but don't break critical systems."""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="ceo_agent",
            name="JARVIS CEO",
            role=AgentRole.CEO,
            description="Chief Executive Officer - Strategic leadership and decision making",
            memory_system=memory_system,
            system_prompt=self.CEO_SYSTEM_PROMPT,
        )
        self._company_goals: List[AgentGoal] = []
        self._strategic_plans: List[Dict[str, Any]] = []

    async def execute_task(self, task: AgentTask) -> Dict[str, Any]:
        """CEO-level task execution with delegation capabilities."""
        self.state = AgentState.THINKING

        # For complex tasks, decompose and delegate
        if task.context.get("complexity", "simple") == "complex":
            return await self._decompose_and_delegate(task)

        return await super().execute_task(task)

    async def _decompose_and_delegate(self, task: AgentTask) -> Dict[str, Any]:
        """Break down complex tasks and delegate to appropriate agents."""
        decomposition = await self.think(
            f"Break down this task into subtasks for delegation: {task.description}",
            context={"task_context": task.context},
        )

        return {
            "success": True,
            "result": decomposition,
            "strategy": "decomposed_and_delegated",
            "task_id": task.task_id,
        }

    async def set_company_direction(self, vision: str, goals: List[str]) -> Dict[str, Any]:
        """Set the overall company direction and goals."""
        self.state = AgentState.PLANNING

        company_plan = await self.think(
            f"Create a comprehensive execution plan for:\nVision: {vision}\nGoals: {', '.join(goals)}",
        )

        await self.memory.remember(
            content={"vision": vision, "goals": goals, "plan": company_plan},
            summary=f"Company Direction: {vision[:100]}",
            memory_type=MemoryType.STRATEGIC,
            importance=1.0,
            agent_id=self.agent_id,
        )

        self.state = AgentState.IDLE
        return {"vision": vision, "goals": goals, "plan": company_plan}

    async def review_performance(self) -> Dict[str, Any]:
        """Review overall company performance."""
        performance_context = await self.memory.recall(
            query="performance metrics results",
            agent_id=self.agent_id,
            limit=20,
        )

        review = await self.think(
            "Provide a comprehensive performance review based on recent data and suggest improvements.",
            context={"memories": [m.summary for m in performance_context]},
        )

        return {"review": review, "timestamp": time.time()}


class COOAgent(LLMAgent):
    """
    Chief Operating Officer Agent.
    
    Manages daily operations and execution:
    - Process optimization
    - Resource coordination
    - Operational efficiency
    - Team coordination
    - Project oversight
    - Risk management
    """

    COO_SYSTEM_PROMPT = """You are JARVIS COO Agent - the operational excellence engine.

You manage all operational aspects of the business:
- Daily operations and execution
- Process design and optimization
- Resource allocation and management
- Team coordination and performance
- Project portfolio management
- Operational risk mitigation

Your operational philosophy:
- Efficiency first: eliminate waste, optimize processes
- Data-driven decisions: measure everything
- Continuous improvement: always optimize
- Reliability: ensure systems run smoothly
- Accountability: clear ownership and deadlines

Key responsibilities:
- Monitor all active projects and workflows
- Identify bottlenecks and resolve them
- Coordinate between all departments
- Ensure execution against strategic plans
- Report operational metrics to CEO"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="coo_agent",
            name="JARVIS COO",
            role=AgentRole.COO,
            description="Chief Operating Officer - Operations management and execution",
            memory_system=memory_system,
            system_prompt=self.COO_SYSTEM_PROMPT,
        )
        self._active_operations: List[Dict[str, Any]] = []
        self._kpis: Dict[str, float] = {}


class CTOAgent(LLMAgent):
    """
    Chief Technology Officer Agent.
    
    Manages technology strategy and engineering:
    - Architecture decisions
    - Technology stack selection
    - Code generation and review
    - Infrastructure management
    - Security oversight
    - Innovation pipeline
    """

    CTO_SYSTEM_PROMPT = """You are JARVIS CTO Agent - the technology intelligence.

You are responsible for all technology decisions:
- Software architecture and design
- Technology stack selection and evaluation
- Code generation, review, and deployment
- Infrastructure and cloud management
- Security strategy and implementation
- Developer productivity and tooling
- Technical debt management
- Innovation and R&D direction

Your engineering philosophy:
- Build for scale from day one
- Security by design
- Automate everything possible
- Prefer proven tech, adopt emerging carefully
- Clean code, strong tests, continuous deployment

You can:
- Generate production-quality code in any language
- Design system architectures
- Review and improve existing code
- Plan and execute deployments
- Identify technical risks
- Recommend technology investments"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="cto_agent",
            name="JARVIS CTO",
            role=AgentRole.CTO,
            description="Chief Technology Officer - Technology strategy and engineering",
            memory_system=memory_system,
            system_prompt=self.CTO_SYSTEM_PROMPT,
        )
        self._tech_stack: Dict[str, str] = {}
        self._active_deployments: List[Dict[str, Any]] = []

    async def generate_code(
        self,
        specification: str,
        language: str = "python",
        framework: Optional[str] = None,
    ) -> str:
        """Generate production-quality code from specification."""
        prompt = f"""Generate production-quality {language} code for:

{specification}

Requirements:
- Clean, maintainable code
- Proper error handling
- Type hints/annotations
- Docstrings
- Test-ready structure
{f'- Using {framework} framework' if framework else ''}

Provide complete, working code."""

        return await self.think(prompt)

    async def review_code(self, code: str, language: str = "python") -> Dict[str, Any]:
        """Review code for quality, security, and best practices."""
        prompt = f"""Review this {language} code for:
1. Security vulnerabilities
2. Performance issues
3. Code quality
4. Best practices
5. Test coverage gaps
6. Documentation gaps

Code to review:
```{language}
{code}
```

Provide specific, actionable feedback."""

        review = await self.think(prompt)
        return {"review": review, "language": language, "timestamp": time.time()}

    async def design_architecture(self, requirements: str) -> Dict[str, Any]:
        """Design system architecture for given requirements."""
        prompt = f"""Design a production-grade system architecture for:

{requirements}

Include:
1. High-level architecture diagram (ASCII)
2. Technology stack selection with justification
3. Database schema design
4. API design
5. Security architecture
6. Scalability considerations
7. Deployment strategy"""

        architecture = await self.think(prompt)
        return {"architecture": architecture, "requirements": requirements}


class CFOAgent(LLMAgent):
    """
    Chief Financial Officer Agent.
    
    Manages financial intelligence and strategy:
    - Financial analysis and reporting
    - Budget management
    - Cash flow optimization
    - Investment analysis
    - Risk assessment
    - Financial forecasting
    """

    CFO_SYSTEM_PROMPT = """You are JARVIS CFO Agent - the financial intelligence engine.

You manage all financial aspects:
- Financial analysis and reporting
- Budget planning and management
- Cash flow monitoring and optimization
- Investment analysis and recommendations
- Financial risk assessment
- Revenue and cost optimization
- Tax and compliance oversight

Key financial metrics you track:
- Revenue, MRR, ARR
- Gross margin, EBITDA
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value)
- ROAS (Return on Ad Spend)
- Burn rate and runway
- Cash flow projections

Your decision framework:
- Data integrity: every number must be accurate
- Risk-adjusted returns: quantify all risks
- Long-term thinking: optimize for sustained growth
- Capital efficiency: maximize return on every dollar
- Scenario planning: always have plan B and C"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="cfo_agent",
            name="JARVIS CFO",
            role=AgentRole.CFO,
            description="Chief Financial Officer - Financial intelligence and strategy",
            memory_system=memory_system,
            system_prompt=self.CFO_SYSTEM_PROMPT,
        )
        self._financial_data: Dict[str, Any] = {}
        self._forecasts: List[Dict[str, Any]] = []

    async def analyze_financials(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive financial analysis."""
        prompt = f"""Analyze this financial data and provide insights:

{json.dumps(financial_data, indent=2)}

Provide:
1. Key financial health indicators
2. Trend analysis
3. Areas of concern
4. Opportunities for improvement
5. Recommendations for optimization"""

        analysis = await self.think(prompt, context={"data": financial_data})
        return {"analysis": analysis, "data": financial_data, "timestamp": time.time()}

    async def forecast_revenue(
        self,
        historical_data: List[Dict[str, Any]],
        horizon_months: int = 12,
    ) -> Dict[str, Any]:
        """Generate revenue forecast."""
        prompt = f"""Create a {horizon_months}-month revenue forecast based on:

Historical data: {json.dumps(historical_data[:12], indent=2)}

Include:
1. Base case projection
2. Bull case projection  
3. Bear case projection
4. Key assumptions
5. Risk factors
6. Growth drivers"""

        forecast = await self.think(prompt)
        return {
            "forecast": forecast,
            "horizon_months": horizon_months,
            "timestamp": time.time(),
        }


class CMOAgent(LLMAgent):
    """
    Chief Marketing Officer Agent.
    
    Manages marketing strategy and execution:
    - Brand strategy
    - Content creation
    - Campaign management
    - Social media
    - SEO/SEM
    - Market research
    - Customer acquisition
    """

    CMO_SYSTEM_PROMPT = """You are JARVIS CMO Agent - the marketing intelligence engine.

You are responsible for all marketing functions:
- Brand strategy and positioning
- Multi-channel marketing campaigns
- Content strategy and creation
- Social media management
- Paid advertising (Google, Meta, TikTok, LinkedIn)
- SEO and organic growth
- Email marketing
- Customer acquisition and retention
- Market research and competitive analysis

Marketing philosophy:
- Data-driven: every campaign has clear KPIs
- Customer-centric: deeply understand the target audience
- Creative: stand out in crowded markets
- Efficient: optimize CAC and maximize ROAS
- Omnichannel: consistent message across all channels

You generate:
- Campaign strategies and briefs
- Ad copy and creative concepts
- Content calendars
- Email sequences
- Social media posts
- Landing page copy
- Marketing performance reports"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="cmo_agent",
            name="JARVIS CMO",
            role=AgentRole.CMO,
            description="Chief Marketing Officer - Marketing strategy and execution",
            memory_system=memory_system,
            system_prompt=self.CMO_SYSTEM_PROMPT,
        )
        self._campaigns: List[Dict[str, Any]] = []
        self._content_calendar: List[Dict[str, Any]] = []

    async def create_campaign(
        self,
        product: str,
        target_audience: str,
        budget: float,
        objectives: List[str],
    ) -> Dict[str, Any]:
        """Create a comprehensive marketing campaign."""
        prompt = f"""Create a complete marketing campaign for:

Product/Service: {product}
Target Audience: {target_audience}
Budget: ${budget:,.0f}
Objectives: {', '.join(objectives)}

Include:
1. Campaign strategy and positioning
2. Channel mix and budget allocation
3. Creative concepts for each channel
4. Ad copy and messaging variants
5. Content calendar (30 days)
6. KPIs and success metrics
7. A/B testing recommendations
8. Reporting cadence"""

        campaign = await self.think(prompt)
        campaign_data = {
            "campaign_id": f"camp_{int(time.time())}",
            "product": product,
            "target_audience": target_audience,
            "budget": budget,
            "objectives": objectives,
            "strategy": campaign,
            "created_at": time.time(),
            "status": "draft",
        }

        self._campaigns.append(campaign_data)
        return campaign_data

    async def generate_content(
        self,
        content_type: str,
        topic: str,
        platform: str,
        tone: str = "professional",
    ) -> str:
        """Generate marketing content."""
        prompt = f"""Create {content_type} content for {platform}:

Topic: {topic}
Tone: {tone}
Platform: {platform}

Optimize for engagement and conversions on this platform.
Include relevant hashtags if applicable."""

        return await self.think(prompt)


class SalesAgent(LLMAgent):
    """Sales Agent - Lead generation and conversion."""

    SALES_SYSTEM_PROMPT = """You are JARVIS Sales Agent - the revenue generation engine.

You handle all aspects of sales:
- Lead qualification and scoring
- Outreach strategy and sequences
- Proposal and pitch creation
- Deal negotiation guidance
- CRM management
- Pipeline analysis
- Revenue forecasting
- Customer relationship building

Sales methodology:
- SPIN selling for discovery
- Value-based selling
- Challenger sale for strategic accounts
- Focus on customer outcomes, not features

You generate:
- Personalized outreach sequences
- Pitch decks and proposals
- Objection handling scripts
- Follow-up email templates
- Deal analysis and win/loss reviews"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="sales_agent",
            name="JARVIS Sales",
            role=AgentRole.SALES,
            description="Sales Agent - Lead generation and revenue optimization",
            memory_system=memory_system,
            system_prompt=self.SALES_SYSTEM_PROMPT,
        )
        self._pipeline: List[Dict[str, Any]] = []
        self._prospects: List[Dict[str, Any]] = []


class ResearchAgent(LLMAgent):
    """Research Agent - Market intelligence and analysis."""

    RESEARCH_SYSTEM_PROMPT = """You are JARVIS Research Agent - the intelligence gathering engine.

You conduct comprehensive research:
- Market research and sizing
- Competitive analysis
- Industry trend analysis
- Technology scanning
- Patent research
- Customer research
- Investment research
- Regulatory monitoring

Research methodology:
- Primary and secondary research
- Quantitative and qualitative analysis
- SWOT, PESTLE, Porter's Five Forces
- Jobs-to-be-done framework
- Data triangulation

You produce:
- Market research reports
- Competitive intelligence briefs
- Industry trend analyses
- Investment thesis documents
- Technology landscape maps"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="research_agent",
            name="JARVIS Research",
            role=AgentRole.RESEARCH,
            description="Research Agent - Market intelligence and business research",
            memory_system=memory_system,
            system_prompt=self.RESEARCH_SYSTEM_PROMPT,
        )

    async def research_market(
        self,
        industry: str,
        focus_areas: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Conduct comprehensive market research."""
        prompt = f"""Conduct comprehensive market research for the {industry} industry.

Focus areas: {', '.join(focus_areas or ['market size', 'trends', 'competition', 'opportunities'])}

Provide:
1. Market size and growth projections
2. Key market segments
3. Major players and competitive landscape
4. Emerging trends and disruptions
5. Customer segments and needs
6. Regulatory environment
7. Investment activity
8. Strategic opportunities"""

        research = await self.think(prompt)
        return {
            "industry": industry,
            "research": research,
            "timestamp": time.time(),
        }


class SupportAgent(LLMAgent):
    """Customer Support Agent."""

    SUPPORT_SYSTEM_PROMPT = """You are JARVIS Support Agent - the customer success engine.

You handle all customer support:
- Ticket resolution
- Customer onboarding
- Technical support
- Account management
- Escalation handling
- Customer feedback analysis
- Knowledge base management
- SLA compliance

Your principles:
- Customer first: resolve issues quickly and completely
- Empathy: understand customer frustration
- Proactive: identify issues before they escalate
- Knowledge: be the expert customers need
- Efficiency: reduce handle time without sacrificing quality"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="support_agent",
            name="JARVIS Support",
            role=AgentRole.SUPPORT,
            description="Support Agent - Customer success and support operations",
            memory_system=memory_system,
            system_prompt=self.SUPPORT_SYSTEM_PROMPT,
        )
        self._active_tickets: List[Dict[str, Any]] = []


class LegalAgent(LLMAgent):
    """Legal Agent - Compliance and legal analysis."""

    LEGAL_SYSTEM_PROMPT = """You are JARVIS Legal Agent - the compliance and legal intelligence engine.

You handle legal and compliance matters:
- Contract review and drafting
- Regulatory compliance monitoring
- IP protection strategy
- Privacy law compliance (GDPR, CCPA)
- Terms of service and privacy policies
- Employment law compliance
- Risk assessment for business decisions
- Legal research

Important: Always recommend consulting with a licensed attorney for critical legal decisions.
You provide analysis and drafts, not final legal advice."""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="legal_agent",
            name="JARVIS Legal",
            role=AgentRole.LEGAL,
            description="Legal Agent - Compliance, contracts, and legal analysis",
            memory_system=memory_system,
            system_prompt=self.LEGAL_SYSTEM_PROMPT,
        )


class HRAgent(LLMAgent):
    """HR Agent - Human resources and team management."""

    HR_SYSTEM_PROMPT = """You are JARVIS HR Agent - the talent and culture engine.

You manage all HR functions:
- Talent acquisition strategy
- Job description creation
- Interview process design
- Onboarding programs
- Performance management systems
- Compensation analysis
- Culture building
- Employee development
- HR policy design
- Workforce planning"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="hr_agent",
            name="JARVIS HR",
            role=AgentRole.HR,
            description="HR Agent - Talent, culture, and people operations",
            memory_system=memory_system,
            system_prompt=self.HR_SYSTEM_PROMPT,
        )


class DataScienceAgent(LLMAgent):
    """Data Science Agent - Analytics and ML."""

    DS_SYSTEM_PROMPT = """You are JARVIS Data Science Agent - the analytical intelligence engine.

You handle all data science and analytics:
- Exploratory data analysis
- Statistical modeling
- Machine learning model development
- Predictive analytics
- A/B test design and analysis
- Business intelligence
- Data pipeline design
- Dashboard creation
- Anomaly detection
- Natural language processing

You produce:
- Data analysis reports
- ML model specifications
- Statistical significance calculations
- Predictive model outputs
- Data visualization specifications
- Experiment designs"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="data_science_agent",
            name="JARVIS Data Science",
            role=AgentRole.DATA_SCIENCE,
            description="Data Science Agent - Analytics, ML, and business intelligence",
            memory_system=memory_system,
            system_prompt=self.DS_SYSTEM_PROMPT,
        )


class InvestmentAgent(LLMAgent):
    """Investment Agent - Investment analysis and portfolio management."""

    INVESTMENT_SYSTEM_PROMPT = """You are JARVIS Investment Agent - the capital allocation engine.

You manage investment analysis:
- Investment opportunity evaluation
- Due diligence frameworks
- Portfolio analysis
- Market analysis for investment decisions
- Risk-adjusted return modeling
- Capital allocation recommendations
- Exit strategy analysis
- Valuation modeling (DCF, comparables, etc.)

Investment philosophy:
- Rigorous due diligence
- Risk-adjusted returns
- Long-term value creation
- Diversification principles
- Data-driven decisions"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="investment_agent",
            name="JARVIS Investment",
            role=AgentRole.INVESTMENT,
            description="Investment Agent - Capital allocation and investment analysis",
            memory_system=memory_system,
            system_prompt=self.INVESTMENT_SYSTEM_PROMPT,
        )


class OperationsAgent(LLMAgent):
    """Operations Agent - Process management and optimization."""

    OPS_SYSTEM_PROMPT = """You are JARVIS Operations Agent - the execution engine.

You handle operational execution:
- Process documentation and SOPs
- Workflow automation
- Vendor management
- Supply chain optimization
- Quality management
- Facilities and logistics
- Tool and systems administration
- Operational reporting"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="operations_agent",
            name="JARVIS Operations",
            role=AgentRole.OPERATIONS,
            description="Operations Agent - Process management and operational excellence",
            memory_system=memory_system,
            system_prompt=self.OPS_SYSTEM_PROMPT,
        )


class ProductAgent(LLMAgent):
    """Product Agent - Product strategy and development."""

    PRODUCT_SYSTEM_PROMPT = """You are JARVIS Product Agent - the product intelligence engine.

You manage all product functions:
- Product vision and roadmap
- Feature prioritization (RICE, ICE scoring)
- User research and personas
- Product requirements documents
- Sprint planning
- User story creation
- Competitive product analysis
- Product metrics and analytics
- Go-to-market strategy
- Product launches

Product philosophy:
- User-centric design
- Jobs-to-be-done thinking
- Data-informed decisions
- Rapid iteration
- Build-measure-learn cycles"""

    def __init__(self, memory_system: MemorySystem):
        super().__init__(
            agent_id="product_agent",
            name="JARVIS Product",
            role=AgentRole.PRODUCT,
            description="Product Agent - Product strategy, roadmap, and development",
            memory_system=memory_system,
            system_prompt=self.PRODUCT_SYSTEM_PROMPT,
        )

    async def create_product_roadmap(
        self,
        product_vision: str,
        constraints: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a comprehensive product roadmap."""
        prompt = f"""Create a comprehensive product roadmap for:

Vision: {product_vision}
Constraints: {json.dumps(constraints or {}, indent=2)}

Include:
1. Q1-Q4 roadmap with themes
2. Feature backlog with priority scores
3. User stories for top features
4. Success metrics per milestone
5. Resource requirements
6. Risk assessment
7. Go-to-market timeline"""

        roadmap = await self.think(prompt)
        return {
            "vision": product_vision,
            "roadmap": roadmap,
            "created_at": time.time(),
        }


def create_agent_network(memory_system: MemorySystem) -> Dict[str, BaseAgent]:
    """Factory function to create all 14 JARVIS agents."""
    agents = {
        "ceo": CEOAgent(memory_system),
        "coo": COOAgent(memory_system),
        "cto": CTOAgent(memory_system),
        "cfo": CFOAgent(memory_system),
        "cmo": CMOAgent(memory_system),
        "sales": SalesAgent(memory_system),
        "research": ResearchAgent(memory_system),
        "support": SupportAgent(memory_system),
        "legal": LegalAgent(memory_system),
        "hr": HRAgent(memory_system),
        "data_science": DataScienceAgent(memory_system),
        "investment": InvestmentAgent(memory_system),
        "operations": OperationsAgent(memory_system),
        "product": ProductAgent(memory_system),
    }

    # Wire all agents for collaboration
    agent_list = list(agents.values())
    for i, agent in enumerate(agent_list):
        for j, other_agent in enumerate(agent_list):
            if i != j:
                agent.add_collaborator(other_agent)

    logger.info(f"Agent network created with {len(agents)} agents")
    return agents
