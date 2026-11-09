import type { AssessmentTrack, ChallengeType } from "@prisma/client";

export type SectorTopic = {
  key: string;
  title: string;
  summary: string;
  focus: string;
  tags: string[];
  type: ChallengeType;
  languages?: string[];
  publicRequirements: string[];
  hiddenRequirements: string[];
  rubric: Record<string, string>;
  mitre?: string[];
  owasp?: string[];
};

const t = (
  key: string,
  title: string,
  summary: string,
  focus: string,
  tags: string[],
  type: ChallengeType,
  publicRequirements: string[],
  hiddenRequirements: string[],
  rubric: Record<string, string>,
  languages?: string[],
): SectorTopic => ({
  key,
  title,
  summary,
  focus,
  tags,
  type,
  publicRequirements,
  hiddenRequirements,
  rubric,
  languages,
});

export const SECTOR_PLANS: { track: AssessmentTrack; topics: SectorTopic[] }[] = [
  {
    track: "FINTECH",
    topics: [
      t("ledger-core", "Double-Entry Ledger Core", "Immutable postings, balances, and reconciliation exports.", "ledger integrity", ["fintech", "ledger"], "DATABASE", ["Accounts", "Postings", "Balances", "Reconcile"], ["Concurrent posting races", "Negative-balance rules"], { database: "Consistency", backend: "Ledger" }),
      t("idempotent-charge", "Idempotent Charge API", "Card charges that never double-bill under retries.", "payments idempotency", ["payments", "idempotency"], "BACKEND", ["Idempotency keys", "Charge API", "Receipts", "Tests"], ["Double-submit storm", "Key collision"], { backend: "Idempotency", reliability: "Retries" }),
      t("fraud-rules", "Fraud Rules Engine", "Score transactions with explainable rule hits.", "fraud", ["fraud", "risk"], "BACKEND", ["Rule DSL", "Score", "Explain", "Allow/deny"], ["Rule injection", "Latency budget"], { backend: "Rules", security: "Abuse" }),
      t("wallet-holds", "Wallet Hold & Capture", "Authorize, hold, capture, and release funds safely.", "wallet", ["wallet", "holds"], "BACKEND", ["Hold", "Capture", "Release", "Ledger links"], ["Partial capture race", "Expired hold"], { database: "Holds", backend: "State machine" }),
      t("pci-scope", "PCI Scope Minimizer", "Keep PAN out of app logs and truncate displays.", "PCI hygiene", ["pci", "security"], "SECURITY", ["Tokenize", "Masked UI", "Log scrub", "Audit"], ["PAN in error paths"], { security: "PCI", frontend: "Masking" }, ["typescript"]),
      t("settlement-batch", "Settlement Batcher", "Net settlement files with checksums and replay protection.", "settlement", ["settlement"], "BACKEND", ["Batch build", "Checksum", "Upload stub", "Replay guard"], ["Duplicate batch"], { backend: "Batching", reliability: "Replay" }),
      t("fx-quote", "FX Quote & Lock", "Quote FX with TTL locks before conversion.", "FX", ["fx", "pricing"], "BACKEND", ["Quote", "Lock TTL", "Convert", "Tests"], ["Stale lock", "Clock skew"], { backend: "Quotes", database: "Locks" }),
      t("dispute-desk", "Chargeback Dispute Desk", "Ingest disputes, gather evidence packs, and deadlines.", "disputes", ["disputes", "ops"], "FULL_STACK_SAAS", ["Ingest", "Evidence pack", "Deadline clock", "Statuses"], ["Missed deadline"], { collaboration: "Ops", backend: "Workflow" }),
      t("kyc-pipeline", "KYC Document Pipeline", "Verify identity docs with retention and access controls.", "KYC", ["kyc", "identity"], "SECURITY", ["Upload", "Review states", "Retention", "Access ACL"], ["Cross-tenant doc"], { security: "ACL", backend: "Pipeline" }),
      t("interest-accrual", "Interest Accrual Engine", "Accrue interest with day-count conventions and audits.", "accrual", ["interest", "ledger"], "DATABASE", ["Accrual job", "Conventions", "Postings", "Audit"], ["Leap-day edge"], { database: "Accrual", backend: "Jobs" }),
    ],
  },
  {
    track: "HEALTHCARE",
    topics: [
      t("phr-vault", "Patient Record Vault", "Store clinical notes with break-glass and full audit.", "PHI vault", ["phi", "ehr"], "PRIVACY_ENG", ["CRUD notes", "Break-glass", "Audit", "Export"], ["Silent access"], { security: "PHI", backend: "Vault" }),
      t("fhir-lite", "FHIR-lite Resource API", "Patient/Encounter resources with consent gates.", "FHIR", ["fhir", "interop"], "BACKEND", ["Patient", "Encounter", "Consent gate", "Tests"], ["Consent bypass"], { backend: "API", security: "Consent" }),
      t("e-prescribe", "E-Prescribe Guardrails", "Prescription orders with interaction checks.", "prescribing", ["rx", "safety"], "BACKEND", ["Order", "Interaction check", "Sign", "Audit"], ["Dangerous combo"], { problemSolving: "Safety", backend: "Orders" }),
      t("hl7-ingress", "HL7/ADT Ingest", "Parse ADT-like events into a durable inbox.", "interop", ["hl7", "ingest"], "DATA_PIPELINE", ["Parse", "Inbox", "Ack", "Poison queue"], ["Malformed storm"], { backend: "Ingest", reliability: "Poison" }),
      t("baa-tracker", "BAA Vendor Tracker", "Track BAAs and PHI processors with reminders.", "BAA", ["baa", "vendor"], "PRIVACY_ENG", ["Vendors", "BAA status", "Reminders", "Risk"], ["Missing BAA"], { security: "Compliance", collaboration: "Vendors" }),
      t("appointment-slots", "Clinic Slot Scheduler", "Book slots with provider calendars and no-shows.", "scheduling", ["scheduling"], "FULL_STACK_SAAS", ["Slots", "Book", "Cancel", "No-show"], ["Double book race"], { backend: "Scheduling", database: "Conflicts" }),
      t("imaging-acl", "Imaging Study ACL", "DICOM-study access by care team only.", "imaging ACL", ["imaging", "acl"], "SECURITY", ["Study ACL", "Care team", "Audit", "Expire"], ["Stale team member"], { security: "ACL", backend: "Access" }),
      t("clinical-alert", "Clinical Alert Router", "Route critical lab alerts with ack SLAs.", "alerts", ["alerts", "sla"], "BACKEND", ["Ingest", "Route", "Ack SLA", "Escalate"], ["Missed ack"], { reliability: "SLA", collaboration: "Escalation" }),
      t("deid-pipeline", "De-identification Pipeline", "De-identify datasets for research export.", "de-id", ["deid", "research"], "PRIVACY_ENG", ["Pipeline", "Safe harbor checks", "Export", "Tests"], ["Residual identifiers"], { security: "De-id", testing: "Coverage" }),
      t("telehealth-session", "Telehealth Session Tokens", "Short-lived session tokens for video visits.", "telehealth", ["telehealth", "tokens"], "SECURITY", ["Issue token", "Join gate", "End session", "Audit"], ["Replay token"], { security: "Tokens", backend: "Sessions" }),
    ],
  },
  {
    track: "GAME_BACKEND",
    topics: [
      t("matchmaker", "Skill Matchmaker", "Match players by MMR with party constraints.", "matchmaking", ["matchmaking", "mmr"], "REALTIME_COMMS", ["Queue", "Match", "Parties", "Cancel"], ["Party split unfair"], { backend: "Matchmaking", architecture: "Queues" }),
      t("authoritative-sim", "Authoritative Sim Tick", "Server-authoritative tick with input reconciliation.", "sim", ["multiplayer", "tick"], "REALTIME_COMMS", ["Tick loop", "Input buffer", "Reconcile", "Tests"], ["Speedhack inputs"], { backend: "Sim", security: "Anti-cheat" }),
      t("inventory-dup", "Inventory Anti-Dupe", "Item grants that cannot duplicate under retries.", "inventory", ["inventory", "economy"], "BACKEND", ["Grant", "Consume", "Trade", "Audit"], ["Dupe glitch"], { database: "Idempotency", security: "Economy" }),
      t("leaderboard", "Season Leaderboard", "Sharded leaderboards with season resets.", "leaderboards", ["leaderboard"], "BACKEND", ["Submit score", "Top-N", "Season reset", "Tests"], ["Clock skew season"], { backend: "Ranking", performance: "Shards" }),
      t("anti-cheat-signals", "Anti-Cheat Signal Bus", "Collect client signals and flag anomalies.", "anti-cheat", ["anticheat"], "SECURITY", ["Ingest signals", "Rules", "Flag", "Appeal stub"], ["Spoofed client"], { security: "Detection", backend: "Signals" }),
      t("lobby-migrate", "Lobby Host Migration", "Migrate lobby authority when host drops.", "lobby", ["lobby", "host"], "REALTIME_COMMS", ["Host elect", "Migrate", "Reconnect", "Tests"], ["Split-brain hosts"], { reliability: "Migration", backend: "State" }),
      t("economy-sink", "Economy Sink Designer", "Craft sinks/faucets with simulation reports.", "economy", ["economy"], "ARCHITECTURE", ["Sinks", "Faucets", "Sim report", "Caps"], ["Inflation runaway"], { architecture: "Economy", problemSolving: "Balance" }),
      t("replay-store", "Match Replay Store", "Store compact replays with integrity hashes.", "replays", ["replay"], "BACKEND", ["Write replay", "Hash", "Fetch", "TTL"], ["Tampered replay"], { backend: "Storage", security: "Integrity" }),
      t("presence-crossplay", "Crossplay Presence", "Presence across platforms with privacy flags.", "presence", ["presence", "crossplay"], "REALTIME_COMMS", ["Set presence", "Friends view", "Privacy", "Tests"], ["Platform leak"], { backend: "Presence", security: "Privacy" }),
      t("party-chat-mod", "Party Chat Moderation", "Moderation hooks and mute enforcement.", "chat", ["chat", "moderation"], "BACKEND", ["Send", "Mute", "Report", "Filter stub"], ["Muted send bypass"], { security: "Moderation", backend: "Chat" }),
    ],
  },
  {
    track: "EMBEDDED_IOT",
    topics: [
      t("ota-update", "Signed OTA Updates", "Deliver signed firmware with rollback.", "OTA", ["ota", "firmware"], "INFRASTRUCTURE", ["Manifest", "Signature verify", "Apply", "Rollback"], ["Unsigned payload"], { security: "Signing", infrastructure: "OTA" }),
      t("device-attest", "Device Attestation Gate", "Admit devices only with valid attestation.", "attestation", ["attestation", "iot"], "SECURITY", ["Attest API", "Policy", "Deny", "Audit"], ["Cloned device"], { security: "Attestation", backend: "Gate" }),
      t("fleet-config", "Fleet Config Push", "Push configs with canaries and ack.", "fleet", ["fleet", "config"], "DISTRIBUTED_INFRA", ["Target set", "Canary", "Ack", "Rollback"], ["Partial fleet fail"], { infrastructure: "Fleet", reliability: "Canary" }),
      t("sensor-ingest", "Sensor Ingest Buffer", "Buffer telemetry with backpressure.", "telemetry", ["sensors", "ingest"], "DATA_PIPELINE", ["Ingest", "Buffer", "Drop policy", "Metrics"], ["Flood"], { backend: "Ingest", performance: "Backpressure" }),
      t("secure-boot-lab", "Secure Boot Checklist Lab", "Model secure boot chain and fail closed.", "secure boot", ["boot", "security"], "SECURITY", ["Chain model", "Fail closed", "Logs", "Tests"], ["Skip stage"], { security: "Boot", architecture: "Chain" }),
      t("mqtt-acl", "MQTT Topic ACL", "Topic ACLs per device identity.", "mqtt", ["mqtt", "acl"], "CLOUD_SECURITY", ["ACL", "Publish/sub", "Deny", "Audit"], ["Topic traversal"], { security: "ACL", infrastructure: "Messaging" }),
      t("power-budget", "Edge Power Budget", "Schedule tasks under a power budget.", "power", ["power", "edge"], "PERFORMANCE", ["Budget", "Scheduler", "Defer", "Report"], ["Budget overrun"], { performance: "Power", problemSolving: "Schedule" }),
      t("offline-store", "Offline Device Store", "Sync when reconnecting without dup writes.", "offline", ["offline", "sync"], "DISTRIBUTED_SYSTEMS", ["Queue", "Sync", "Dedup", "Conflict"], ["Dup on flap"], { reliability: "Sync", database: "Dedup" }),
      t("cert-rotate", "Device Cert Rotation", "Rotate device certs with overlap windows.", "certs", ["certs", "rotation"], "SECURITY", ["Issue", "Overlap", "Revoke", "Audit"], ["Expired mid-session"], { security: "PKI", infrastructure: "Rotation" }),
      t("gateway-bridge", "Protocol Gateway Bridge", "Bridge constrained devices to cloud APIs.", "gateway", ["gateway", "bridge"], "INFRASTRUCTURE", ["Translate", "Auth", "Rate limit", "Health"], ["Amplification"], { infrastructure: "Bridge", security: "Auth" }),
    ],
  },
  {
    track: "EDTECH",
    topics: [
      t("lms-roster", "LMS Roster Sync", "Sync courses/rosters with idempotent upserts.", "roster", ["lms", "roster"], "FULL_STACK_SAAS", ["Sync", "Upsert", "Drop enroll", "Audit"], ["Partial sync"], { backend: "Sync", reliability: "Idempotency" }),
      t("assignment-autograde", "Assignment Autograder", "Run student submissions in a sandbox harness.", "autograde", ["grading", "sandbox"], "BACKEND", ["Submit", "Harness", "Score", "Feedback"], ["Escape attempt"], { security: "Sandbox", testing: "Harness" }),
      t("proctor-signals", "Proctoring Signal Desk", "Collect integrity signals with appeal workflow.", "proctoring", ["proctor", "integrity"], "SECURITY", ["Signals", "Flag", "Appeal", "Retention"], ["False positive flood"], { security: "Integrity", collaboration: "Appeals" }),
      t("content-version", "Curriculum Versioning", "Version lessons with publish/rollback.", "curriculum", ["content", "versioning"], "FULL_STACK_SAAS", ["Draft", "Publish", "Rollback", "Diff"], ["Broken publish"], { backend: "Versioning", collaboration: "Content" }),
      t("ferpa-export", "FERPA Data Export", "Student data export with guardian rules.", "FERPA", ["ferpa", "privacy"], "PRIVACY_ENG", ["Export", "Guardian gate", "Audit", "Redact"], ["Wrong guardian"], { security: "Privacy", backend: "Export" }),
      t("quiz-bank", "Quiz Item Bank", "Item bank with forms and exposure control.", "assessment", ["quiz", "items"], "BACKEND", ["Items", "Forms", "Exposure caps", "Stats"], ["Overexposed item"], { backend: "Bank", testing: "Forms" }),
      t("class-realtime", "Classroom Presence", "Live classroom presence and hand-raise.", "presence", ["realtime", "class"], "REALTIME_COMMS", ["Join", "Hand raise", "Presence", "Kick"], ["Ghost students"], { backend: "Realtime", collaboration: "Classroom" }),
      t("plagiarism-hash", "Submission Similarity", "Hash-based similarity hints for submissions.", "similarity", ["plagiarism"], "BACKEND", ["Hash", "Compare", "Report", "Threshold"], ["Obfuscation trivial"], { problemSolving: "Similarity", testing: "Cases" }),
    ],
  },
  {
    track: "LOGISTICS",
    topics: [
      t("route-optimize", "Route Optimizer Lite", "Optimize stops under time windows.", "routing", ["routing", "vrp"], "BACKEND", ["Stops", "Windows", "Route", "Cost"], ["Infeasible window"], { problemSolving: "Routing", performance: "Solver" }),
      t("shipment-track", "Shipment Tracker", "Track handoffs with immutable events.", "tracking", ["shipment", "events"], "BACKEND", ["Events", "Status", "ETA", "Webhook"], ["Out-of-order events"], { backend: "Tracking", reliability: "Ordering" }),
      t("warehouse-slot", "Warehouse Slotting", "Assign SKUs to bins with constraints.", "warehouse", ["wms", "slotting"], "DATABASE", ["Bins", "Assign", "Constraints", "Report"], ["Capacity overflow"], { database: "Constraints", backend: "Assign" }),
      t("carrier-rate", "Carrier Rate Shopper", "Shop rates with SLA and surcharge rules.", "rates", ["carriers", "rates"], "BACKEND", ["Quotes", "Surcharges", "Pick", "Cache"], ["Stale quote"], { backend: "Quotes", performance: "Cache" }),
      t("pod-capture", "Proof of Delivery", "Capture POD photos/signatures with geo.", "POD", ["pod", "delivery"], "MOBILE_APP", ["Capture", "Geo", "Upload", "Verify"], ["Spoofed geo"], { security: "Integrity", mobile: "Capture" }, ["typescript"]),
      t("inventory-asn", "ASN Inbound Flow", "Advance shipping notices into receiving.", "ASN", ["asn", "receiving"], "BACKEND", ["ASN", "Receive", "Variance", "Post"], ["Over-receive"], { backend: "Inbound", database: "Variance" }),
      t("cold-chain", "Cold Chain Monitor", "Alert on temperature excursions.", "cold chain", ["iot", "coldchain"], "DATA_PIPELINE", ["Ingest temps", "Thresholds", "Alert", "Report"], ["Sensor gap"], { reliability: "Alerts", backend: "Monitor" }),
      t("dock-schedule", "Dock Appointment Book", "Schedule docks without collisions.", "docks", ["dock", "scheduling"], "FULL_STACK_SAAS", ["Book", "Conflict check", "Reschedule", "No-show"], ["Double book"], { backend: "Scheduling", collaboration: "Dock" }),
    ],
  },
  {
    track: "CLIMATE_ENERGY",
    topics: [
      t("grid-telemetry", "Grid Telemetry Ingest", "Ingest meter data with late-arrival handling.", "telemetry", ["energy", "meters"], "DATA_PIPELINE", ["Ingest", "Late data", "Aggregate", "Gaps"], ["Clock skew"], { backend: "Ingest", reliability: "Late data" }),
      t("carbon-ledger", "Carbon Ledger", "Track emissions factors and attributed usage.", "carbon", ["carbon", "ledger"], "DATABASE", ["Factors", "Attribute", "Report", "Audit"], ["Double count"], { database: "Attribution", backend: "Reports" }),
      t("demand-response", "Demand Response Dispatch", "Dispatch load sheds with ack SLAs.", "DR", ["demand-response"], "DISTRIBUTED_INFRA", ["Dispatch", "Ack", "Fallback", "Report"], ["Missed ack"], { infrastructure: "Dispatch", reliability: "SLA" }),
      t("forecast-api", "Load Forecast API", "Serve forecasts with model version pins.", "forecast", ["forecast", "ml"], "ML_PLATFORM", ["Pin model", "Predict", "Interval", "Monitor"], ["Stale model"], { backend: "Serving", testing: "Monitor" }),
      t("ppa-settlement", "PPA Settlement Calc", "Settle power purchase agreements.", "PPA", ["ppa", "settlement"], "BACKEND", ["Meter", "Contract", "Settle", "Export"], ["Missing interval"], { backend: "Settlement", database: "Contracts" }),
      t("site-optimizer", "Site Energy Optimizer", "Optimize battery charge under tariffs.", "battery", ["battery", "optimize"], "PERFORMANCE", ["Tariff", "Optimize", "Schedule", "Report"], ["Constraint break"], { problemSolving: "Optimize", performance: "Solver" }),
      t("mrv-pipeline", "MRV Evidence Pack", "Measurement/reporting/verification evidence packs.", "MRV", ["mrv", "evidence"], "BACKEND", ["Collect", "Hash", "Export", "Verify"], ["Tampered evidence"], { security: "Integrity", collaboration: "MRV" }),
      t("outage-map", "Outage Map Service", "Publish outage polygons with ETRs.", "outages", ["outage", "map"], "FULL_STACK_SAAS", ["Publish", "ETR", "Subscribe", "Clear"], ["Stale outage"], { backend: "Outages", frontend: "Map" }, ["typescript"]),
    ],
  },
  {
    track: "REGTECH",
    topics: [
      t("policy-engine", "Policy-as-Code Engine", "Evaluate compliance policies against facts.", "policy", ["policy", "opa-like"], "BACKEND", ["Policies", "Eval", "Explain", "Tests"], ["Policy injection"], { security: "Policy", backend: "Eval" }),
      t("sar-workflow", "SAR Case Workflow", "Suspicious activity cases with four-eyes review.", "SAR", ["sar", "aml"], "FULL_STACK_SAAS", ["Case", "Four-eyes", "File", "Audit"], ["Self-approve"], { security: "Controls", collaboration: "Review" }),
      t("retention-legal", "Legal Hold Overlay", "Overlay legal holds on retention engines.", "legal hold", ["legal-hold", "retention"], "PRIVACY_ENG", ["Hold", "Block delete", "Release", "Audit"], ["Delete under hold"], { security: "Hold", backend: "Retention" }),
      t("trade-surveil", "Trade Surveillance Rules", "Flag wash trades / layering patterns.", "surveillance", ["surveillance", "markets"], "BACKEND", ["Rules", "Flag", "Explain", "Queue"], ["Evasion pattern"], { security: "Detect", problemSolving: "Patterns" }),
      t("license-entitlements", "License Entitlement Gate", "Gate features by jurisdiction licenses.", "licensing", ["license", "entitlements"], "BACKEND", ["Entitlements", "Gate", "Audit", "Tests"], ["Wrong jurisdiction"], { security: "Entitlements", backend: "Gate" }),
      t("audit-pack", "Regulator Audit Pack", "Export evidence packs for an exam request.", "audit", ["audit", "export"], "BACKEND", ["Request", "Collect", "Export", "Hash"], ["Incomplete pack"], { collaboration: "Audit", security: "Integrity" }),
      t("conflict-check", "Conflicts Check Service", "Check party conflicts before engagement.", "conflicts", ["conflicts", "legal"], "BACKEND", ["Parties", "Check", "Waive", "Audit"], ["Hidden related party"], { problemSolving: "Conflicts", security: "Controls" }),
      t("disclosure-portal", "Disclosure Portal", "Versioned regulatory disclosures with attestations.", "disclosures", ["disclosures"], "FULL_STACK_SAAS", ["Draft", "Attest", "Publish", "History"], ["Attest without read"], { collaboration: "Attest", backend: "Versioning" }),
    ],
  },
  {
    track: "DEVTOOLS",
    topics: [
      t("lsp-mini", "Mini Language Server", "Implement hover/complete for a toy language.", "LSP", ["lsp", "ide"], "BACKEND", ["Hover", "Complete", "Diagnostics", "Tests"], ["Crash on bad AST"], { backend: "LSP", testing: "Fixtures" }, ["typescript"]),
      t("ci-plugin", "CI Plugin Runner", "Run plugins with timeouts and artifact upload.", "CI", ["ci", "plugins"], "INFRASTRUCTURE", ["Run", "Timeout", "Artifacts", "Logs"], ["Plugin escape"], { security: "Sandbox", infrastructure: "CI" }),
      t("feature-flag-sdk", "Dev Flag SDK", "Local overrides + remote flags for engineers.", "flags", ["flags", "sdk"], "BACKEND", ["Remote", "Override", "Audit", "Tests"], ["Prod override leak"], { backend: "SDK", security: "Overrides" }, ["typescript"]),
      t("schema-migrate-cli", "Schema Migrate CLI", "CLI for expand/contract migrations.", "migrations", ["cli", "migrations"], "DATABASE", ["Generate", "Apply", "Rollback", "Dry-run"], ["Destructive without confirm"], { database: "Migrations", testing: "CLI" }),
      t("debug-adapter", "Debug Adapter Stub", "DAP-like breakpoints and stack frames.", "debugger", ["dap", "debug"], "BACKEND", ["Break", "Continue", "Stack", "Scopes"], ["Infinite step"], { backend: "Debug", problemSolving: "Control" }),
      t("repo-analytics", "Repo Analytics Bot", "PR risk signals from diff stats.", "analytics", ["github", "risk"], "BACKEND", ["Ingest PR", "Score", "Comment stub", "Config"], ["Huge diff OOM"], { backend: "Analytics", performance: "Limits" }),
      t("sandbox-runner", "Ephemeral Sandbox Runner", "Run untrusted snippets with resource caps.", "sandbox", ["sandbox", "runner"], "SECURITY", ["Run", "CPU/mem caps", "Network deny", "Result"], ["Network dial-out"], { security: "Isolation", infrastructure: "Runner" }),
      t("codegen-template", "Safe Codegen Templates", "Generate code without injection.", "codegen", ["codegen", "templates"], "BACKEND", ["Templates", "Escape", "Preview", "Tests"], ["Template injection"], { security: "Injection", backend: "Codegen" }),
      t("extension-host", "Editor Extension Host", "Load extensions with permission prompts.", "extensions", ["extensions", "permissions"], "SECURITY", ["Load", "Permissions", "Revoke", "Audit"], ["Silent permission"], { security: "Permissions", architecture: "Host" }),
      t("test-impact", "Test Impact Analysis", "Select tests affected by a diff.", "TIA", ["testing", "tia"], "DEBUGGING", ["Map deps", "Select", "Report", "Fallback all"], ["Missed dep"], { testing: "Selection", performance: "Speed" }),
    ],
  },
  {
    track: "DESIGN_SYSTEMS",
    topics: [
      t("token-pipeline", "Design Token Pipeline", "Transform tokens to platform CSS/JSON.", "tokens", ["tokens", "design"], "FRONTEND", ["Tokens", "Transforms", "Themes", "Tests"], ["Broken reference"], { frontend: "Tokens", architecture: "Pipeline" }, ["typescript"]),
      t("a11y-kit", "Accessible Component Kit", "Button/Input/Dialog with full keyboard a11y.", "a11y", ["a11y", "components"], "FRONTEND", ["Components", "Keyboard", "Focus", "Contrast"], ["Focus trap fail"], { frontend: "A11y", testing: "Axe-like" }, ["typescript"]),
      t("visual-regression", "Visual Regression Hooks", "Snapshot components with stable themes.", "visual", ["visual", "regression"], "FRONTEND", ["Snapshots", "Themes", "Diff report", "CI gate stub"], ["Flaky animation"], { testing: "Visual", frontend: "Stability" }, ["typescript"]),
      t("docs-site", "Living Docs Site", "Doc site with live examples and props tables.", "docs", ["docs", "storybook-like"], "FRONTEND", ["Docs MDX-like", "Live demo", "Props", "Search"], ["Broken example"], { frontend: "Docs", collaboration: "DX" }, ["typescript"]),
      t("rtl-themes", "RTL + Density Themes", "Support RTL and compact density tokens.", "i18n UI", ["rtl", "density"], "FRONTEND", ["RTL", "Density", "Switch", "Tests"], ["Mirrored icons wrong"], { frontend: "i18n", architecture: "Themes" }, ["typescript"]),
      t("form-primitives", "Form Primitive System", "Composable forms with validation UX.", "forms", ["forms", "ux"], "FRONTEND", ["Field", "Error UX", "Submit", "A11y"], ["Announce fail"], { frontend: "Forms", testing: "Validation" }, ["typescript"]),
      t("icon-pipeline", "Icon Pipeline", "Optimize SVGs and enforce viewBox rules.", "icons", ["icons", "svg"], "FRONTEND", ["Ingest", "Optimize", "Tree-shake", "Lint"], ["Huge SVG"], { performance: "Icons", frontend: "Pipeline" }, ["typescript"]),
      t("release-train", "Design System Release", "Version packages with changelogs and codemods.", "release", ["release", "codemod"], "ARCHITECTURE", ["Version", "Changelog", "Codemod", "Migrate guide"], ["Breaking without major"], { architecture: "Release", collaboration: "DX" }),
    ],
  },
  {
    track: "GROWTH",
    topics: [
      t("experiment-assign", "Experiment Assignment", "Sticky bucketing with exclusions.", "experiments", ["ab", "bucketing"], "BACKEND", ["Assign", "Sticky", "Exclude", "Exposure log"], ["Reshuffle"], { backend: "Bucketing", testing: "Sticky" }),
      t("feature-exposure", "Exposure Logging", "Deduped exposures for analytics honesty.", "exposure", ["exposure", "analytics"], "DATA_PIPELINE", ["Log", "Dedup", "Schema", "Sink"], ["Double count"], { backend: "Logging", database: "Dedup" }),
      t("metric-guardrail", "Experiment Guardrails", "Auto-stop on guardrail metric burns.", "guardrails", ["guardrail", "slo"], "BACKEND", ["Metrics", "Threshold", "Stop", "Alert"], ["Late metric"], { reliability: "Guardrails", problemSolving: "Stats" }),
      t("funnel-builder", "Funnel Builder", "Define funnels and compute conversion.", "funnels", ["funnels", "analytics"], "BACKEND", ["Steps", "Convert", "Segment", "Export"], ["Out-of-order events"], { backend: "Funnels", testing: "Ordering" }),
      t("paywall-ent", "Paywall Entitlements", "Gate premium with trials and grace.", "paywall", ["paywall", "monetization"], "FULL_STACK_SAAS", ["Trial", "Gate", "Grace", "Restore"], ["Grace forever"], { backend: "Entitlements", frontend: "Paywall" }, ["typescript"]),
      t("referral-fraud", "Referral Fraud Controls", "Detect self-referral and device farms.", "referrals", ["referral", "fraud"], "SECURITY", ["Codes", "Redeem", "Fraud rules", "Audit"], ["Device farm"], { security: "Fraud", backend: "Referrals" }),
      t("onboarding-cron", "Onboarding Experiment", "Orchestrate onboarding steps with holdouts.", "onboarding", ["onboarding", "lifecycle"], "FULL_STACK_SAAS", ["Steps", "Holdout", "Complete", "Analytics"], ["Skip required"], { frontend: "Onboarding", backend: "Orchestration" }, ["typescript"]),
      t("promo-engine", "Promo Engine", "Stacking rules for coupons and caps.", "promos", ["coupons", "pricing"], "BACKEND", ["Rules", "Stack", "Caps", "Redeem"], ["Stack exploit"], { backend: "Pricing", security: "Abuse" }),
    ],
  },
  {
    track: "SEARCH_RECS",
    topics: [
      t("inverted-index", "Inverted Index Service", "Build and query an inverted index.", "index", ["search", "index"], "BACKEND", ["Index", "Query", "Delete", "Tests"], ["Stale delete"], { backend: "Index", performance: "Query" }),
      t("query-rewrite", "Query Rewrite Layer", "Synonyms, spellfix, and filters.", "rewrite", ["search", "nlp"], "BACKEND", ["Synonyms", "Spell", "Filters", "Explain"], ["Injection in rewrite"], { backend: "Rewrite", security: "Input" }),
      t("ranking-features", "Ranking Feature Store", "Online features for rankers with freshness.", "features", ["ranking", "features"], "ML_PLATFORM", ["Write", "Read", "TTL", "Monitor"], ["Stale feature"], { backend: "Features", performance: "Freshness" }),
      t("rec-blender", "Recommendation Blender", "Blend multiple candidate sources safely.", "recs", ["recs", "blend"], "BACKEND", ["Sources", "Blend", "Diversity", "Fallback"], ["Empty source"], { architecture: "Blend", backend: "Recs" }),
      t("personalize-privacy", "Personalization Privacy", "Respect opt-outs in recs.", "privacy", ["recs", "privacy"], "PRIVACY_ENG", ["Opt-out", "Enforce", "Audit", "Tests"], ["Opt-out ignored"], { security: "Privacy", backend: "Enforce" }),
      t("typeahead", "Typeahead Service", "Prefix search with latency budgets.", "typeahead", ["typeahead", "ux"], "PERFORMANCE", ["Prefix", "Limit", "Cache", "Budget"], ["Pathological prefix"], { performance: "Latency", backend: "Prefix" }),
      t("eval-harness", "Ranking Eval Harness", "Offline eval with nDCG-like metric.", "eval", ["eval", "ranking"], "DEBUGGING", ["Dataset", "Metric", "Report", "Gate"], ["Leaky eval"], { testing: "Eval", problemSolving: "Metrics" }),
      t("safe-search", "Safe Search Filter", "Filter unsafe content with appeals.", "safety", ["safety", "filter"], "SECURITY", ["Filter", "Labels", "Appeal", "Audit"], ["Bypass encoding"], { security: "Safety", backend: "Filter" }),
    ],
  },
  {
    track: "SUPPORT_ENG",
    topics: [
      t("ticket-router", "Ticket Router", "Route tickets by skill and SLA.", "routing", ["support", "routing"], "BACKEND", ["Rules", "Assign", "SLA clock", "Reassign"], ["SLA miss silent"], { backend: "Routing", collaboration: "Support" }),
      t("macro-engine", "Macro Reply Engine", "Templated replies with variable safety.", "macros", ["macros", "support"], "BACKEND", ["Templates", "Vars", "Preview", "Send"], ["Template injection"], { security: "Templates", backend: "Macros" }),
      t("csat-pipeline", "CSAT Pipeline", "Collect CSAT and attribute to tickets.", "CSAT", ["csat", "analytics"], "DATA_PIPELINE", ["Survey", "Attribute", "Aggregate", "Export"], ["Orphan survey"], { backend: "Pipeline", testing: "Attribution" }),
      t("kb-search", "Help Center Search", "KB search with helpfulness feedback.", "KB", ["kb", "search"], "FULL_STACK_SAAS", ["Articles", "Search", "Feedback", "Publish"], ["Stale article"], { backend: "Search", frontend: "KB" }, ["typescript"]),
      t("sla-breach", "SLA Breach Alerts", "Alert and escalate on breach risk.", "SLA", ["sla", "alerts"], "BACKEND", ["Predict risk", "Alert", "Escalate", "Ack"], ["No-op escalate"], { reliability: "SLA", collaboration: "Escalate" }),
      t("redact-transcript", "Transcript Redaction", "Redact PII from chat transcripts.", "redaction", ["pii", "support"], "PRIVACY_ENG", ["Redact", "Review", "Export", "Tests"], ["Missed card number"], { security: "Redaction", testing: "PII" }),
      t("merge-tickets", "Ticket Merge", "Merge duplicates with event timelines.", "merge", ["tickets", "merge"], "BACKEND", ["Detect dup", "Merge", "Timeline", "Undo"], ["Lost events"], { backend: "Merge", reliability: "Timeline" }),
      t("agent-workspace", "Agent Workspace API", "Unified customer context for agents.", "workspace", ["agent", "context"], "BACKEND", ["Context", "ACL", "Freshness", "Audit"], ["Cross-customer leak"], { security: "ACL", backend: "Context" }),
    ],
  },
  {
    track: "AI_MLOPS",
    topics: [
      t("model-registry", "Model Registry", "Register models with stages and approvals.", "registry", ["mlops", "registry"], "ML_PLATFORM", ["Register", "Stage", "Approve", "Rollback"], ["Prod without approve"], { backend: "Registry", collaboration: "Approvals" }),
      t("feature-store", "Online Feature Store", "Point-in-time correct feature reads.", "features", ["feature-store"], "ML_PLATFORM", ["Write", "Point-in-time", "Online", "Monitor"], ["Leakage"], { database: "PIT", backend: "Features" }),
      t("rag-eval", "RAG Eval Suite", "Evaluate groundedness and refusal.", "RAG eval", ["rag", "eval"], "AI_SAAS", ["Cases", "Scores", "Gate", "Report"], ["Ungrounded pass"], { testing: "Eval", security: "Grounding" }),
      t("prompt-firewall", "Prompt Injection Firewall", "Detect/block injection before tools run.", "prompt security", ["llm", "injection"], "SECURITY", ["Detect", "Block", "Allowlist tools", "Audit"], ["Obfuscated inject"], { security: "Injection", backend: "Firewall" }),
      t("batch-infer", "Batch Inference Jobs", "Chunked batch inference with retries.", "batch", ["inference", "jobs"], "ML_PLATFORM", ["Enqueue", "Chunk", "Retry", "Output"], ["Poison row"], { reliability: "Jobs", backend: "Batch" }),
      t("drift-monitor", "Drift Monitor", "Detect input/output drift and alert.", "drift", ["drift", "monitor"], "ML_PLATFORM", ["Baselines", "Detect", "Alert", "Report"], ["Silent drift"], { testing: "Monitor", problemSolving: "Drift" }),
      t("tool-router", "LLM Tool Router", "Route tool calls with auth scopes.", "tools", ["agents", "tools"], "AI_SAAS", ["Register tools", "Scope", "Invoke", "Log"], ["Scope escape"], { security: "AuthZ", architecture: "Tools" }),
      t("canary-model", "Model Canary Deploy", "Canary traffic to a new model revision.", "canary", ["deploy", "canary"], "INFRASTRUCTURE", ["Split", "Metrics", "Promote", "Rollback"], ["Bad canary auto-promote"], { infrastructure: "Canary", reliability: "Rollback" }),
      t("embedding-index", "Embedding Index Service", "Upsert/query vectors with tenant isolation.", "vectors", ["embeddings", "index"], "AI_SAAS", ["Upsert", "Query", "Delete", "Tenant ACL"], ["Cross-tenant hit"], { security: "Tenancy", performance: "ANN" }),
      t("cost-governor", "LLM Cost Governor", "Budgets and rate limits per workspace.", "cost", ["cost", "llm"], "BACKEND", ["Budget", "Meter", "Deny", "Report"], ["Budget bypass"], { backend: "Metering", security: "Limits" }),
    ],
  },
  {
    track: "DATABASE_ENGINEERING",
    topics: [
      t("buffer-pool", "Buffer Pool Simulator", "Page cache with eviction policy.", "buffer pool", ["db", "cache"], "DATABASE", ["Get/put", "Evict", "Stats", "Tests"], ["Thrash"], { database: "Cache", performance: "Eviction" }),
      t("wal-replay", "WAL Replay", "Write-ahead log and crash recovery.", "WAL", ["wal", "recovery"], "DATABASE", ["Append", "Checkpoint", "Replay", "Tests"], ["Torn write"], { database: "Recovery", reliability: "Crash" }),
      t("mvcc-lite", "MVCC Snapshot Reads", "Snapshot isolation lite with versions.", "MVCC", ["mvcc", "tx"], "DATABASE", ["Begin", "Read snapshot", "Commit", "GC"], ["See dirty"], { database: "Isolation", testing: "Concurrency" }),
      t("query-planner", "Toy Query Planner", "Plan scans/joins with cost notes.", "planner", ["sql", "planner"], "DATABASE", ["Parse", "Plan", "Explain", "Tests"], ["Cartesian blowup"], { database: "Planner", architecture: "Costs" }),
      t("index-select", "Index Selection Advisor", "Recommend indexes from workload.", "indexes", ["indexes", "advisor"], "DATABASE", ["Workload", "Recommend", "What-if", "Report"], ["Redundant indexes"], { database: "Indexes", problemSolving: "Advise" }),
      t("shard-router", "Shard Router", "Route keys to shards with reshard notes.", "sharding", ["shard", "routing"], "DISTRIBUTED_SYSTEMS", ["Route", "Reshard plan", "Fanout", "Tests"], ["Wrong shard"], { architecture: "Sharding", backend: "Router" }),
      t("backup-verify", "Backup Verify Tool", "Checksum backups and restore drill.", "backup", ["backup", "dr"], "INFRASTRUCTURE", ["Backup", "Checksum", "Restore drill", "Report"], ["Corrupt backup"], { reliability: "DR", infrastructure: "Backup" }),
      t("conn-pool", "Connection Pool", "Pool with timeouts and stampede control.", "pool", ["pool", "db"], "PERFORMANCE", ["Acquire", "Release", "Timeout", "Metrics"], ["Leak"], { performance: "Pool", reliability: "Timeouts" }),
    ],
  },
  {
    track: "NETWORK_EDGE",
    topics: [
      t("cdn-cache", "CDN Cache Key Lab", "Design cache keys and purge APIs.", "CDN", ["cdn", "cache"], "PERFORMANCE", ["Keys", "Purge", "Vary", "Tests"], ["Cache poison"], { performance: "Cache", security: "Poison" }),
      t("dns-failover", "DNS Failover Controller", "Health-based DNS failover with flapping guard.", "DNS", ["dns", "failover"], "DISTRIBUTED_INFRA", ["Health", "Failover", "Cooldown", "Audit"], ["Flap"], { infrastructure: "DNS", reliability: "Failover" }),
      t("lb-algo", "Load Balancer Algorithms", "Round-robin, least-conn, consistent hash.", "LB", ["lb", "balancing"], "INFRASTRUCTURE", ["Algorithms", "Health", "Drain", "Tests"], ["Unhealthy still routed"], { infrastructure: "LB", testing: "Algos" }),
      t("tls-terminator", "TLS Terminator Stub", "Terminate TLS with cert rotation.", "TLS", ["tls", "edge"], "SECURITY", ["Terminate", "Rotate cert", "OCSP stub", "Metrics"], ["Expired cert served"], { security: "TLS", infrastructure: "Edge" }),
      t("waf-rules", "WAF Rule Pack", "Block SQLi/XSS patterns with allowlists.", "WAF", ["waf", "appsec"], "SECURITY", ["Rules", "Allowlist", "Logs", "Tests"], ["Bypass encoding"], { security: "WAF", testing: "Bypass" }),
      t("anycast-health", "Anycast Health Beacons", "Withdraw routes on local failure.", "anycast", ["anycast", "bgp-like"], "DISTRIBUTED_INFRA", ["Beacon", "Withdraw", "Restore", "Tests"], ["False withdraw"], { infrastructure: "Anycast", reliability: "Health" }),
      t("rate-edge", "Edge Rate Limiter", "Distributed edge limits with fairness.", "rate limit", ["edge", "ratelimit"], "PERFORMANCE", ["Limit", "Headers", "Fairness", "Tests"], ["Hot key"], { performance: "Limits", infrastructure: "Edge" }),
      t("http3-notes", "HTTP/3 Migration Notes", "Spike QUIC/HTTP3 readiness checklist + demo.", "HTTP3", ["http3", "quic"], "ARCHITECTURE", ["Checklist", "Spike", "Metrics plan", "Rollback"], ["Hidden constraint"], { architecture: "Migration", performance: "Protocol" }),
    ],
  },
  {
    track: "CLOUD_INFRA_SECURITY",
    topics: [
      t("iam-least", "IAM Least Privilege Builder", "Generate least-privilege policies from traces.", "IAM", ["iam", "least-privilege"], "IDENTITY_ACCESS", ["Trace", "Policy", "Diff", "Apply stub"], ["Admin left over"], { security: "IAM", architecture: "Policies" }),
      t("secret-broker", "Cloud Secret Broker", "Short-lived secrets with rotation evidence.", "secrets", ["secrets", "rotation"], "SECURITY", ["Issue", "Rotate", "Revoke", "Audit"], ["Secret in logs"], { security: "Secrets", infrastructure: "Rotation" }),
      t("image-scan-gate", "Image Scan Gate", "Block deploys on critical CVEs.", "supply chain", ["containers", "cve"], "CLOUD_SECURITY", ["Scan", "Gate", "Exception", "Audit"], ["Critical pass"], { security: "Supply chain", infrastructure: "Deploy" }),
      t("k8s-psp", "K8s Hardening Pack", "Pod security constraints and network policies.", "k8s", ["k8s", "networkpolicy"], "CLOUD_SECURITY", ["PSS", "NetPol", "Demo", "Tests"], ["Privileged escape"], { security: "K8s", infrastructure: "Policies" }),
      t("audit-cloudtrail", "Cloud Audit Triage", "Triage suspicious API trails.", "audit", ["cloudtrail", "detection"], "DETECTION_ENGINEERING", ["Ingest", "Detect", "Triage", "Case"], ["Missed admin key"], { security: "Detect", problemSolving: "Triage" }),
      t("vpc-segmentation", "VPC Segmentation Lab", "Segment tiers and prove isolation.", "network", ["vpc", "segmentation"], "CLOUD_SECURITY", ["Tiers", "Routes", "Deny east-west", "Tests"], ["SSRF path"], { security: "Network", architecture: "Segments" }),
      t("oidc-federation", "OIDC Federation", "Federate IdP with audience checks.", "OIDC", ["oidc", "federation"], "IDENTITY_ACCESS", ["Federate", "Audience", "Map roles", "Audit"], ["Aud confusion"], { security: "Identity", backend: "OIDC" }),
      t("breakglass", "Break-glass Access", "Time-boxed elevates with recording.", "breakglass", ["breakglass", "pam"], "IDENTITY_ACCESS", ["Request", "Approve", "Expire", "Record"], ["Sticky elevate"], { security: "PAM", collaboration: "Approve" }),
      t("iac-policy", "IaC Policy Pack", "Fail CI on public buckets / open SG.", "IaC", ["terraform", "policy"], "CLOUD_SECURITY", ["Policies", "Scan plan", "Fail", "Exceptions"], ["Public bucket"], { security: "IaC", testing: "Policy" }),
      t("runtime-detect", "Runtime Threat Detect", "Detect crypto-miner patterns on hosts.", "runtime", ["runtime", "detection"], "DETECTION_ENGINEERING", ["Signals", "Rule", "Alert", "Suppress"], ["Noisy false positive"], { security: "Detect", infrastructure: "Runtime" }),
    ],
  },
  {
    track: "QA_RELIABILITY",
    topics: [
      t("flake-quarantine", "Flake Quarantine System", "Detect flakes and quarantine with owners.", "flakes", ["flakes", "ci"], "DEBUGGING", ["Detect", "Quarantine", "Owner", "Reaper"], ["Forever quarantine"], { testing: "Flakes", collaboration: "Owners" }),
      t("contract-tests", "Consumer Contract Suite", "Pact-like contracts between services.", "contracts", ["contracts", "testing"], "DEBUGGING", ["Consumer", "Provider verify", "Broker stub", "CI"], ["Breaking change silent"], { testing: "Contracts", architecture: "Boundaries" }),
      t("chaos-gameday", "Chaos Gameday Kit", "Scripted chaos with abort criteria.", "chaos", ["chaos", "gameday"], "DISTRIBUTED_INFRA", ["Inject", "Observe", "Abort", "Report"], ["Blast radius"], { infrastructure: "Chaos", problemSolving: "Gameday" }),
      t("perf-regression", "Perf Regression Gate", "Fail builds on p95 regressions.", "perf", ["perf", "ci"], "PERFORMANCE", ["Bench", "Compare", "Gate", "Bisect hints"], ["Noisy bench"], { performance: "Gate", testing: "Bench" }),
      t("synthetic-probes", "Synthetic Probes", "Multi-region synthetics with alert routing.", "synthetics", ["synthetics", "sre"], "SRE_RELIABILITY", ["Probes", "Regions", "Alert", "Dash data"], ["Silent fail"], { reliability: "Synthetics", infrastructure: "Probes" }),
      t("test-data-factory", "Test Data Factory", "Build realistic fixtures with PII fakes.", "fixtures", ["testdata", "privacy"], "DEBUGGING", ["Factory", "Fakes", "Seed", "Cleanup"], ["Prod PII used"], { testing: "Data", security: "PII" }),
      t("release-checklist", "Release Checklist Bot", "Enforce release gates from evidence.", "release", ["release", "gates"], "INFRASTRUCTURE", ["Checklist", "Evidence links", "Block", "Override"], ["Override without reason"], { collaboration: "Release", reliability: "Gates" }),
      t("incident-template", "Incident Template Pack", "Severity taxonomy + timeline tooling.", "incident", ["incident", "qe"], "PRODUCTION_INCIDENT", ["Sev model", "Timeline", "Comms", "Postmortem"], ["Wrong sev"], { problemSolving: "Incident", collaboration: "Comms" }),
    ],
  },
  {
    track: "COMPILER_TOOLING",
    topics: [
      t("lexer", "Lexer for Toy Lang", "Tokenize a small language with locations.", "lexer", ["compiler", "lexer"], "BACKEND", ["Tokens", "Locations", "Errors", "Tests"], ["Infinite loop input"], { backend: "Lexer", testing: "Corpus" }),
      t("parser-pratt", "Pratt Parser", "Parse expressions with precedence.", "parser", ["compiler", "parser"], "BACKEND", ["Parse", "AST", "Errors", "Tests"], ["Ambiguity"], { backend: "Parser", architecture: "AST" }),
      t("typecheck", "Typechecker Lite", "Infer/check types for a subset.", "types", ["compiler", "types"], "BACKEND", ["Infer", "Check", "Errors", "Tests"], ["Recursive type blowup"], { backend: "Types", problemSolving: "Infer" }),
      t("ir-lower", "IR Lowering Pass", "Lower AST to a simple IR.", "IR", ["compiler", "ir"], "BACKEND", ["Lower", "Verify IR", "Dump", "Tests"], ["Malformed IR"], { backend: "IR", testing: "Verify" }),
      t("bytecode-vm", "Bytecode VM", "Execute bytecode with a stack machine.", "VM", ["vm", "bytecode"], "BACKEND", ["Ops", "Execute", "Traps", "Tests"], ["Stack smash"], { backend: "VM", security: "Traps" }),
      t("sourcemap", "Source Map Generator", "Map generated code back to source.", "sourcemaps", ["sourcemaps"], "BACKEND", ["Generate", "Lookup", "VLQ stub", "Tests"], ["Off-by-one"], { backend: "Maps", testing: "Lookup" }),
      t("formatter", "Code Formatter", "Pretty-print AST with stable output.", "format", ["formatter"], "BACKEND", ["Format", "Idempotent", "Config", "Tests"], ["Non-idempotent"], { backend: "Format", testing: "Idempotence" }),
      t("incremental", "Incremental Compile Cache", "Cache artifacts by fingerprint.", "incremental", ["cache", "build"], "PERFORMANCE", ["Fingerprint", "Cache", "Invalidate", "Stats"], ["Stale hit"], { performance: "Cache", backend: "Build" }),
    ],
  },
  {
    track: "BLOCKCHAIN",
    topics: [
      t("wallet-signer", "Wallet Signer Service", "Sign transactions with policy limits.", "wallet", ["wallet", "signing"], "SECURITY", ["Sign", "Policy limits", "Audit", "Deny"], ["Over-limit sign"], { security: "Keys", backend: "Policy" }),
      t("erc20-vesting", "Token Vesting Contract Lab", "Vesting schedule with cliff and revoke.", "vesting", ["token", "vesting"], "BACKEND", ["Cliff", "Release", "Revoke", "Tests"], ["Early release"], { backend: "Contract logic", testing: "Schedules" }),
      t("bridge-watcher", "Bridge Watcher", "Watch deposits/withdrawals with finality.", "bridge", ["bridge", "finality"], "DISTRIBUTED_SYSTEMS", ["Watch", "Finality", "Mint/burn stubs", "Alerts"], ["Reorg handling"], { reliability: "Finality", security: "Bridge" }),
      t("mev-aware-submit", "MEV-Aware Submit", "Submit txs with private relay option.", "MEV", ["mev", "submit"], "BACKEND", ["Build tx", "Relay option", "Fallback", "Metrics"], ["Public mempool leak"], { security: "MEV", backend: "Submit" }),
      t("indexer", "Chain Indexer", "Index events into queryable store.", "indexer", ["indexer", "etl"], "DATA_PIPELINE", ["Ingest blocks", "Decode events", "Query", "Reorg"], ["Gap"], { backend: "Indexer", reliability: "Reorg" }),
      t("multisig", "Multisig Approvals", "M-of-N approvals for sensitive ops.", "multisig", ["multisig", "governance"], "SECURITY", ["Propose", "Approve", "Execute", "Audit"], ["Replay approve"], { security: "Multisig", collaboration: "Approvals" }),
      t("oracle-feed", "Oracle Price Feed", "Aggregate feeds with outlier rejection.", "oracle", ["oracle", "prices"], "BACKEND", ["Ingest", "Aggregate", "Outliers", "Heartbeat"], ["Stale feed"], { reliability: "Oracle", backend: "Aggregate" }),
      t("allowlist-mint", "Allowlist Mint Gate", "Mint with Merkle allowlist proofs.", "mint", ["nft", "allowlist"], "BACKEND", ["Merkle proof", "Mint", "Cap", "Tests"], ["Proof reuse"], { security: "Allowlist", backend: "Mint" }),
    ],
  },
];
