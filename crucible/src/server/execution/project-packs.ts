import { CHALLENGE_CATALOG, type ChallengeSeed } from "@/server/challenges/catalog";
import type { StarterFile } from "./starters";

function challengeFor(slug: string): ChallengeSeed | undefined {
  return CHALLENGE_CATALOG.find((c) => c.slug === slug);
}

export function missionBriefFiles(slug: string, track: string, language: string): StarterFile[] {
  const c = challengeFor(slug);
  const title = c?.title ?? slug;
  const summary = c?.summary ?? "Complete the Crucible assessment.";
  const description = c?.description ?? summary;
  const publicReqs = (c?.publicRequirements as string[]) ?? [];
  const hiddenReqs = (c?.hiddenRequirements as string[]) ?? [];
  const levels = c?.adaptiveTrack ?? [];
  const rubric = c?.gradingRubric ?? {};
  const tags = c?.tags ?? [];

  const brief = `# Mission brief — ${title}

**Track:** ${track}  
**Language:** ${language}  
**Difficulty:** ${c?.difficulty ?? "—"}/10  
**Tags:** ${tags.join(", ") || "general"}

## Objective
${summary}

${description}

## Public deliverables (you must demonstrate)
${publicReqs.map((r, i) => `${i + 1}. ${r}`).join("\n") || "1. Working solution with tests"}

## Hidden evaluation (graded, not fully disclosed)
${hiddenReqs.map((r, i) => `${i + 1}. ${r}`).join("\n") || "1. Evidence-based hidden harnesses"}

## Adaptive levels
${
  levels.length
    ? levels.map((l) => `- **L${l.level} — ${l.title}:** ${l.criteria}`).join("\n")
    : "- Progress by shipping evidence; reviewers raise the bar as you clear levels."
}

## Rubric focus
${
  Object.keys(rubric).length
    ? Object.entries(rubric)
        .map(([k, v]) => `- **${k}:** ${v}`)
        .join("\n")
    : "- Architecture, security, correctness, testing, delivery"
}

## Session rules
- Commit often with clear messages.
- Prefer evidence in code + tests over slides.
- Do not escape the sandbox or attack systems outside this workspace.
- AI assists are allowed; you own the design and tradeoffs.
`;

  const checklist = `# Deliverables checklist

## Must ship
${publicReqs.map((r) => `- [ ] ${r}`).join("\n") || "- [ ] Working core path with tests"}
- [ ] Architecture notes in \`docs/ARCHITECTURE.md\`
- [ ] Public tests green (\`Run tests\`)
- [ ] Deploy check passes (\`Verify deploy\`)
- [ ] Commit history shows incremental progress

## Evidence for hidden bar
${hiddenReqs.map((r) => `- [ ] ${r}`).join("\n") || "- [ ] Hidden harness signals present in code"}
- [ ] No leftover TODOs on critical paths
- [ ] Findings / threat notes updated if cyber track

## Submit
When ready: **Submit for evaluation** — public + hidden + deploy evidence feed the score report.
`;

  const architecture = `# Architecture proposal — ${title}

## Context
${summary}

## Components
| Component | Responsibility | Trust zone |
|-----------|----------------|------------|
| Edge / API |  | public → private |
| Auth |  | private |
| Data store |  | data |
| Workers / async |  | private |

## Trust boundaries
1. Internet → edge
2. Edge → services
3. Services → data / secrets

## Data model (sketch)
\`\`\`
# entities + tenancy keys
\`\`\`

## Failure modes
- Dependency outage
- Poisoned / duplicate events
- Privilege escalation / tenant bleed

## Mitigations
- Idempotency keys
- Least privilege
- Structured audit log

## Adaptive path notes
${levels
  .slice(0, 4)
  .map((l) => `- L${l.level} ${l.title}: ${l.criteria}`)
  .join("\n") || "- Document how you will clear progressive difficulty."}
`;

  return [
    { path: "BRIEF.md", content: brief, language: "markdown" },
    { path: "CHECKLIST.md", content: checklist, language: "markdown" },
    { path: "docs/ARCHITECTURE.md", content: architecture, language: "markdown" },
  ];
}

/** Domain scaffolds beyond the thin default mini-SaaS. */
export function domainPackFiles(slug: string): StarterFile[] {
  switch (slug) {
    case "saas-nexus":
      return saasNexusPack();
    case "signal-feed":
      return signalFeedPack();
    case "relay-chat":
      return relayChatPack();
    case "team-forge":
      return teamForgePack();
    case "api-forge":
      return apiForgePack();
    case "mesh-control":
      return meshControlPack();
    case "marketforge":
      return marketForgePack();
    case "lumen-ai":
      return lumenAiPack();
    case "codewatch-review":
      return codewatchPack();
    case "appsec-fortress":
      return []; // handled in starters with lab server — briefs still merge
    case "soc-nightwatch":
      return socExtras();
    default:
      return typeFallback(slug);
  }
}

function typeFallback(slug: string): StarterFile[] {
  const c = challengeFor(slug);
  const type = c?.type ?? "BACKEND";
  if (type === "VIDEO_PLATFORM" || type === "REALTIME_COMMS") return [];
  if (String(type).includes("SECURITY") || c?.track === "CYBERSECURITY") {
    return [
      {
        path: "docs/RUNBOOK.md",
        content: `# Lab runbook — ${slug}\n\n## Scope\nIn-lab only.\n\n## Reproduce\n1. Start lab target\n2. Capture evidence\n3. Patch + regression test\n`,
        language: "markdown",
      },
    ];
  }
  return [
    {
      path: "docs/ACCEPTANCE.md",
      content: `# Acceptance scenarios — ${slug}\n\n## Happy path\n1. …\n\n## Failure path\n1. …\n\n## Security / tenancy\n1. …\n`,
      language: "markdown",
    },
  ];
}

function saasNexusPack(): StarterFile[] {
  return [
    {
      path: "src/server.ts",
      content: `import http from "http";
import { URL } from "url";

/** Mini multi-tenant SaaS skeleton — extend auth, billing, admin, isolation. */
type User = { id: string; email: string; password: string; role: "owner" | "admin" | "member"; orgId: string };
type Org = { id: string; name: string; plan: "free" | "pro" };
type Invoice = { id: string; orgId: string; amount: number; status: "open" | "paid" };
type Audit = { at: string; actor: string; action: string; meta?: unknown };

const orgs = new Map<string, Org>([["org_acme", { id: "org_acme", name: "Acme", plan: "free" }]]);
const users = new Map<string, User>();
const invoices = new Map<string, Invoice>();
const audits: Audit[] = [];
const paymentIntents = new Map<string, { orgId: string; amount: number; charged: boolean }>();

function audit(actor: string, action: string, meta?: unknown) {
  audits.push({ at: new Date().toISOString(), actor, action, meta });
}

export function register(email: string, password: string, orgName: string, orgId = \`org_\${Date.now()}\`) {
  if (users.has(email)) throw new Error("exists");
  if (!orgs.has(orgId)) orgs.set(orgId, { id: orgId, name: orgName, plan: "free" });
  const user: User = { id: \`u_\${users.size + 1}\`, email, password, role: "owner", orgId };
  users.set(email, user);
  audit(email, "user.register", { orgId });
  return { id: user.id, email, orgId, role: user.role };
}

export function login(email: string, password: string) {
  const u = users.get(email);
  if (!u || u.password !== password) throw new Error("invalid");
  audit(email, "user.login", { orgId: u.orgId });
  return {
    email: u.email,
    role: u.role,
    orgId: u.orgId,
    token: Buffer.from(\`\${u.email}:\${u.orgId}\`).toString("base64"),
  };
}

export function parseToken(token: string | null) {
  if (!token) return null;
  try {
    const [email, orgId] = Buffer.from(token, "base64").toString("utf8").split(":");
    const u = users.get(email || "");
    if (!u || u.orgId !== orgId) return null;
    return u;
  } catch {
    return null;
  }
}

/** TODO: enforce orgId from auth — IDOR lab surface for adaptive levels */
export function listInvoices(orgId: string) {
  return [...invoices.values()].filter((i) => i.orgId === orgId);
}

export function createInvoice(orgId: string, amount: number) {
  const id = \`inv_\${invoices.size + 1}\`;
  const inv: Invoice = { id, orgId, amount, status: "open" };
  invoices.set(id, inv);
  audit("system", "invoice.create", { id, orgId, amount });
  return inv;
}

/** TODO: make idempotent — duplicate intents must not double-charge */
export function chargeIntent(intentId: string, orgId: string, amount: number) {
  const existing = paymentIntents.get(intentId);
  if (existing) return { status: "duplicate" as const, total: existing.amount };
  paymentIntents.set(intentId, { orgId, amount, charged: true });
  audit("billing", "payment.charge", { intentId, orgId, amount });
  return { status: "ok" as const, total: amount };
}

export function getAudits() {
  return audits.slice();
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || "/", "http://saas.local");
  const json = (code: number, body: unknown) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (u.pathname === "/health") return json(200, { ok: true, service: "saas-nexus" });

  if (u.pathname === "/auth/register" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    try {
      return json(201, register(body.email, body.password, body.orgName || "Org"));
    } catch (e) {
      return json(400, { error: String(e) });
    }
  }

  if (u.pathname === "/auth/login" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    try {
      return json(200, login(body.email, body.password));
    } catch {
      return json(401, { error: "invalid" });
    }
  }

  const auth = parseToken(req.headers["x-token"] as string);
  if (u.pathname === "/invoices" && req.method === "GET") {
    const orgId = u.searchParams.get("orgId") || auth?.orgId || "";
    return json(200, listInvoices(orgId));
  }

  if (u.pathname === "/invoices" && req.method === "POST") {
    if (!auth) return json(401, { error: "auth required" });
    const body = JSON.parse((await readBody(req)) || "{}");
    return json(201, createInvoice(auth.orgId, Number(body.amount) || 0));
  }

  if (u.pathname === "/billing/charge" && req.method === "POST") {
    if (!auth) return json(401, { error: "auth required" });
    const body = JSON.parse((await readBody(req)) || "{}");
    return json(200, chargeIntent(body.intentId, auth.orgId, Number(body.amount) || 0));
  }

  if (u.pathname === "/admin/audits") {
    if (!auth || (auth.role !== "owner" && auth.role !== "admin")) return json(403, { error: "forbidden" });
    return json(200, getAudits());
  }

  json(404, { error: "not found" });
});

if (process.env.RUN_SERVER === "1") server.listen(4060, () => console.log("saas-nexus on 4060"));

export { server, users, orgs, invoices };
`,
      language: "typescript",
    },
    {
      path: "src/admin.ts",
      content: `/** Admin dashboard stubs — wire org listing, plan changes, privilege grants with audit. */
export type AdminView = { orgs: number; openInvoices: number };

export function adminSummary(orgCount: number, openInvoices: number): AdminView {
  return { orgs: orgCount, openInvoices };
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { register, login, createInvoice, listInvoices, chargeIntent, getAudits } from "../src/server";

export async function runPublicTests() {
  const results: { name: string; pass: boolean; hidden?: boolean }[] = [];
  try {
    const a = register("owner@acme.test", "pw", "Acme", "org_test_a");
    const session = login("owner@acme.test", "pw");
    results.push({ name: "register_login", pass: session.orgId === a.orgId });
    createInvoice(a.orgId, 25);
    results.push({ name: "invoice_create_list", pass: listInvoices(a.orgId).length === 1 });
    const c1 = chargeIntent("intent_1", a.orgId, 25);
    results.push({ name: "payment_charge", pass: c1.status === "ok" });
    results.push({ name: "audit_trail", pass: getAudits().length >= 2 });
  } catch {
    results.push({ name: "register_login", pass: false });
  }
  return results;
}
`,
      language: "typescript",
    },
    {
      path: "tests/hidden.manifest.json",
      content: JSON.stringify(
        {
          tests: [
            { id: "tenant-isolation", description: "Users cannot read other org invoices even if orgId is guessed" },
            { id: "idempotent-payment", description: "Duplicate payment intents do not double-charge" },
            { id: "audit-privilege", description: "Privilege changes emit complete audit events" },
          ],
        },
        null,
        2,
      ),
      language: "json",
    },
  ];
}

function signalFeedPack(): StarterFile[] {
  return [
    {
      path: "src/server.ts",
      content: `import http from "http";
import { URL } from "url";

type Video = {
  id: string;
  userId: string;
  title: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  likes: number;
  reported: boolean;
};
type Job = { id: string; videoId: string; attempts: number; poisoned?: boolean };
type Follow = { follower: string; followee: string };

const videos = new Map<string, Video>();
const queue: Job[] = [];
const follows: Follow[] = [];
const rateWindow = new Map<string, number[]>();

function rateOk(userId: string, limit = 10) {
  const now = Date.now();
  const window = (rateWindow.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (window.length >= limit) return false;
  window.push(now);
  rateWindow.set(userId, window);
  return true;
}

export function upload(userId: string, title: string) {
  if (!rateOk(userId)) throw new Error("rate_limited");
  const id = \`vid_\${videos.size + 1}\`;
  videos.set(id, { id, userId, title, status: "uploaded", likes: 0, reported: false });
  queue.push({ id: \`job_\${id}\`, videoId: id, attempts: 0 });
  return videos.get(id)!;
}

/** TODO: retries, poison handling, dead-letter after N attempts */
export function processNext() {
  const job = queue.shift();
  if (!job) return null;
  const v = videos.get(job.videoId);
  if (!v) return null;
  if (job.poisoned) {
    job.attempts += 1;
    if (job.attempts < 3) {
      queue.push(job);
      v.status = "processing";
      return v;
    }
    v.status = "failed";
    return v;
  }
  v.status = "ready";
  return v;
}

export function follow(follower: string, followee: string) {
  follows.push({ follower, followee });
}

export function like(videoId: string) {
  const v = videos.get(videoId);
  if (!v || v.status !== "ready") throw new Error("not_ready");
  v.likes += 1;
  return v;
}

export function report(videoId: string) {
  const v = videos.get(videoId);
  if (!v) throw new Error("missing");
  v.reported = true;
  return v;
}

export function feed(userId: string, limit = 20) {
  const following = new Set(follows.filter((f) => f.follower === userId).map((f) => f.followee));
  return [...videos.values()]
    .filter((v) => v.status === "ready" && !v.reported && (following.size === 0 || following.has(v.userId)))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);
}

export function enqueuePoison(videoId: string) {
  queue.push({ id: \`poison_\${videoId}\`, videoId, attempts: 0, poisoned: true });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || "/", "http://signal.local");
  if (u.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, queued: queue.length, videos: videos.size }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

if (process.env.RUN_SERVER === "1") server.listen(4061);
export { server, videos, queue, follows };
`,
      language: "typescript",
    },
    {
      path: "src/moderation.ts",
      content: `/** Moderation hooks — expand with classifiers / keyword blocks. */
const BLOCKED = ["spam-scam", "hate-demo"];

export function moderateTitle(title: string) {
  const hit = BLOCKED.find((b) => title.toLowerCase().includes(b));
  return { ok: !hit, reason: hit ?? null };
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { upload, processNext, feed, follow, like } from "../src/server";
import { moderateTitle } from "../src/moderation";
export async function runPublicTests() {
  follow("u1", "creator");
  upload("creator", "hello");
  const processed = processNext();
  like(processed!.id);
  return [
    { name: "upload_process", pass: processed?.status === "ready" },
    { name: "feed_ready_only", pass: feed("u1").length === 1 },
    { name: "moderation_blocks", pass: moderateTitle("buy spam-scam now").ok === false },
  ];
}
`,
      language: "typescript",
    },
    {
      path: "tests/hidden.manifest.json",
      content: JSON.stringify(
        {
          tests: [
            { id: "feed-efficiency", description: "Feed stays O(following) under load harness" },
            { id: "poison-recovery", description: "Poisoned jobs fail after retries without wedging queue" },
            { id: "rate-limit", description: "Upload rate limit enforced per user" },
          ],
        },
        null,
        2,
      ),
      language: "json",
    },
  ];
}

function relayChatPack(): StarterFile[] {
  return [
    {
      path: "src/server.ts",
      content: `/** Realtime messaging skeleton — add WS, receipts, ordering, multi-instance. */
export type Message = {
  id: string;
  roomId: string;
  userId: string;
  body: string;
  seq: number;
  clientId?: string;
};
export type Presence = { userId: string; typing: boolean; lastSeen: number };

const rooms = new Map<string, Message[]>();
const presence = new Map<string, Map<string, Presence>>();
const seenClientIds = new Set<string>();
let seq = 0;

export function send(roomId: string, userId: string, body: string, clientId?: string) {
  if (clientId && seenClientIds.has(clientId)) {
    const existing = (rooms.get(roomId) ?? []).find((m) => m.clientId === clientId);
    if (existing) return { message: existing, duplicate: true as const };
  }
  const list = rooms.get(roomId) ?? [];
  const msg: Message = { id: \`m_\${++seq}\`, roomId, userId, body, seq, clientId };
  list.push(msg);
  rooms.set(roomId, list);
  if (clientId) seenClientIds.add(clientId);
  return { message: msg, duplicate: false as const };
}

export function history(roomId: string, afterSeq = 0) {
  return (rooms.get(roomId) ?? []).filter((m) => m.seq > afterSeq);
}

export function setTyping(roomId: string, userId: string, typing: boolean) {
  const map = presence.get(roomId) ?? new Map();
  map.set(userId, { userId, typing, lastSeen: Date.now() });
  presence.set(roomId, map);
  return [...map.values()];
}

export function markRead(roomId: string, userId: string, upToSeq: number) {
  return { roomId, userId, upToSeq, at: Date.now() };
}

export function health() {
  return { ok: true, rooms: rooms.size };
}
`,
      language: "typescript",
    },
    {
      path: "src/ws-stub.ts",
      content: `/** WebSocket fan-out stub — replace with real WS server for multi-client demos. */
type Listener = (event: string, payload: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

export function subscribe(roomId: string, listener: Listener) {
  const set = listeners.get(roomId) ?? new Set();
  set.add(listener);
  listeners.set(roomId, set);
  return () => set.delete(listener);
}

export function broadcast(roomId: string, event: string, payload: unknown) {
  for (const l of listeners.get(roomId) ?? []) l(event, payload);
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { send, history, health, setTyping } from "../src/server";
export async function runPublicTests() {
  send("r1", "u1", "hi", "c1");
  const dup = send("r1", "u1", "hi", "c1");
  send("r1", "u2", "yo", "c2");
  const presence = setTyping("r1", "u2", true);
  return [
    { name: "send_history", pass: history("r1").length === 2 },
    { name: "idempotent_client_id", pass: dup.duplicate === true },
    { name: "typing_presence", pass: presence.some((p) => p.typing) },
    { name: "health", pass: health().ok },
  ];
}
`,
      language: "typescript",
    },
    {
      path: "tests/hidden.manifest.json",
      content: JSON.stringify(
        {
          tests: [
            { id: "ordering-reconnect", description: "History after reconnect preserves order without duplicates" },
            { id: "multi-instance", description: "Two process instances agree on seq for a room" },
          ],
        },
        null,
        2,
      ),
      language: "json",
    },
  ];
}

function teamForgePack(): StarterFile[] {
  return [
    {
      path: "docs/OWNERS.md",
      content: `# Team ownership — Forge

| Surface | Owner | Duties |
|---------|-------|--------|
| API / contracts |  | Auth, persistence, integration tests |
| Client / UX |  | Flows, a11y, review |
| Security |  | Threat notes, PR checklist |
| Infra |  | Deploy, health, rollback |

## Integration contract
Document shared types and event names before coding.
`,
      language: "markdown",
    },
    {
      path: "src/server.ts",
      content: `/** Collaborative delivery skeleton — split ownership, keep contracts green. */
export function health() {
  return { ok: true, service: "team-forge" };
}

export function contractVersion() {
  return "2026.1";
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { health, contractVersion } from "../src/server";
export async function runPublicTests() {
  return [
    { name: "health", pass: health().ok },
    { name: "contract", pass: contractVersion().startsWith("2026") },
  ];
}
`,
      language: "typescript",
    },
  ];
}

function apiForgePack(): StarterFile[] {
  return [
    {
      path: "src/server.ts",
      content: `import http from "http";
import { URL } from "url";

/** API design pack — versioning, pagination, idempotency, errors. */
const items = new Map<string, { id: string; name: string }>();

export function createItem(name: string, idempotencyKey?: string) {
  const id = idempotencyKey ? \`item_\${idempotencyKey}\` : \`item_\${items.size + 1}\`;
  if (idempotencyKey && items.has(id)) return { item: items.get(id)!, duplicate: true };
  const item = { id, name };
  items.set(id, item);
  return { item, duplicate: false };
}

export function listItems(cursor = 0, limit = 10) {
  const all = [...items.values()];
  return { data: all.slice(cursor, cursor + limit), next: cursor + limit < all.length ? cursor + limit : null };
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || "/", "http://api.local");
  if (u.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

if (process.env.RUN_SERVER === "1") server.listen(4062);
export { server, items };
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { createItem, listItems } from "../src/server";
export async function runPublicTests() {
  const a = createItem("alpha", "k1");
  const b = createItem("alpha-again", "k1");
  return [
    { name: "create", pass: !!a.item.id },
    { name: "idempotent_create", pass: b.duplicate === true && b.item.id === a.item.id },
    { name: "list", pass: listItems().data.length >= 1 },
  ];
}
`,
      language: "typescript",
    },
  ];
}

function socExtras(): StarterFile[] {
  return [
    {
      path: "telemetry/events.ndjson",
      content: `{"ts":"2026-11-04T12:00:01Z","type":"auth.login","user":"jlee","ip":"203.0.113.9","geo":"US"}
{"ts":"2026-11-04T12:04:12Z","type":"auth.login","user":"jlee","ip":"198.51.100.22","geo":"SG"}
{"ts":"2026-11-04T12:05:01Z","type":"token.use","svc":"billing","asn":"AS9999","new":true}
{"ts":"2026-11-04T12:06:40Z","type":"dns.volume","host":"api-3","qps":9001}
{"ts":"2026-11-04T12:08:02Z","type":"sudo.fail","host":"bastion","user":"ops"}
`,
      language: "json",
    },
    {
      path: "docs/CONTAINMENT.md",
      content: `# Containment worksheet

## Hypotheses
1.

## Actions taken
| Time | Action | Result |
|------|--------|--------|
|  |  |  |

## Customer impact
`,
      language: "markdown",
    },
  ];
}

function meshControlPack(): StarterFile[] {
  return [
    {
      path: "src/mesh.ts",
      content: `export type Node = { id: string; healthy: boolean; weight: number };
export type CallResult = { ok: boolean; nodeId: string; latencyMs: number; error?: string };

const nodes = new Map<string, Node>();
const breakers = new Map<string, { open: boolean; failures: number }>();

export function register(id: string, weight = 1) {
  nodes.set(id, { id, healthy: true, weight });
  breakers.set(id, { open: false, failures: 0 });
}

export function mark(id: string, healthy: boolean) {
  const n = nodes.get(id);
  if (n) n.healthy = healthy;
}

/** TODO: honor weights, skip open breakers, record latency */
export function pick(): Node | null {
  const ready = [...nodes.values()].filter((n) => n.healthy && !breakers.get(n.id)?.open);
  return ready[0] ?? null;
}

export function recordFailure(id: string, threshold = 3) {
  const b = breakers.get(id) ?? { open: false, failures: 0 };
  b.failures += 1;
  if (b.failures >= threshold) b.open = true;
  breakers.set(id, b);
}

export function recordSuccess(id: string) {
  breakers.set(id, { open: false, failures: 0 });
}

export function call(latencyMs = 5): CallResult {
  const node = pick();
  if (!node) return { ok: false, nodeId: "none", latencyMs: 0, error: "no_capacity" };
  return { ok: true, nodeId: node.id, latencyMs };
}
`,
      language: "typescript",
    },
    {
      path: "src/server.ts",
      content: `import { call, register, mark, recordFailure } from "./mesh";
register("svc-a", 2);
register("svc-b", 1);

export function health() {
  return { ok: true, probe: call() };
}

export function injectLatencyPartition() {
  mark("svc-a", false);
  recordFailure("svc-a");
  return call();
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { health, injectLatencyPartition } from "../src/server";
import { register, pick, recordFailure, mark } from "../src/mesh";
export async function runPublicTests() {
  register("t1");
  register("t2");
  recordFailure("t1");
  recordFailure("t1");
  recordFailure("t1");
  mark("t1", true);
  return [
    { name: "health", pass: health().ok },
    { name: "breaker_skips_open", pass: pick()?.id === "t2" || pick()?.id === "svc-b" || !!pick() },
    { name: "partition_fallback", pass: injectLatencyPartition().nodeId !== "none" },
  ];
}
`,
      language: "typescript",
    },
  ];
}

function marketForgePack(): StarterFile[] {
  return [
    {
      path: "src/server.ts",
      content: `type Product = { id: string; name: string; price: number; stock: number };
type CartItem = { productId: string; qty: number };
type Order = { id: string; items: CartItem[]; total: number; status: "pending" | "paid" | "failed" };

const catalog = new Map<string, Product>([
  ["sku_1", { id: "sku_1", name: "Widget", price: 10, stock: 5 }],
  ["sku_2", { id: "sku_2", name: "Gadget", price: 25, stock: 2 }],
]);
const carts = new Map<string, CartItem[]>();
const orders = new Map<string, Order>();
const paidIntents = new Set<string>();

export function addToCart(userId: string, productId: string, qty: number) {
  const p = catalog.get(productId);
  if (!p) throw new Error("missing");
  const cart = carts.get(userId) ?? [];
  cart.push({ productId, qty });
  carts.set(userId, cart);
  return cart;
}

/** TODO: transactional inventory decrement — no oversell under concurrency */
export function checkout(userId: string, paymentIntent?: string) {
  if (paymentIntent && paidIntents.has(paymentIntent)) {
    return { duplicate: true, order: [...orders.values()].find((o) => o.id.endsWith(paymentIntent)) };
  }
  const cart = carts.get(userId) ?? [];
  let total = 0;
  for (const item of cart) {
    const p = catalog.get(item.productId)!;
    if (p.stock < item.qty) throw new Error("insufficient_stock");
    p.stock -= item.qty;
    total += p.price * item.qty;
  }
  const id = \`ord_\${orders.size + 1}_\${paymentIntent ?? "x"}\`;
  const order: Order = { id, items: cart, total, status: "paid" };
  orders.set(id, order);
  if (paymentIntent) paidIntents.add(paymentIntent);
  carts.set(userId, []);
  return { duplicate: false, order };
}

export function listCatalog() {
  return [...catalog.values()];
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { addToCart, checkout, listCatalog } from "../src/server";
export async function runPublicTests() {
  addToCart("u1", "sku_1", 1);
  const a = checkout("u1", "pay_1");
  const b = checkout("u1", "pay_1");
  return [
    { name: "catalog", pass: listCatalog().length >= 2 },
    { name: "checkout", pass: a.order?.status === "paid" },
    { name: "idempotent_payment", pass: b.duplicate === true },
  ];
}
`,
      language: "typescript",
    },
  ];
}

function lumenAiPack(): StarterFile[] {
  return [
    {
      path: "src/providers.ts",
      content: `export type Provider = { id: string; healthy: boolean; costPer1k: number };

const providers: Provider[] = [
  { id: "primary", healthy: true, costPer1k: 2 },
  { id: "fallback", healthy: true, costPer1k: 4 },
];

export function listProviders() {
  return providers.slice();
}

export function setHealthy(id: string, healthy: boolean) {
  const p = providers.find((x) => x.id === id);
  if (p) p.healthy = healthy;
}

export async function complete(prompt: string, preferred = "primary") {
  const order = [preferred, ...providers.map((p) => p.id).filter((id) => id !== preferred)];
  for (const id of order) {
    const p = providers.find((x) => x.id === id);
    if (!p?.healthy) continue;
    return { provider: p.id, text: \`echo:\${prompt.slice(0, 80)}\`, tokens: Math.ceil(prompt.length / 4) };
  }
  throw new Error("no_provider");
}
`,
      language: "typescript",
    },
    {
      path: "src/server.ts",
      content: `import { complete, setHealthy } from "./providers";

const usage = new Map<string, number>();
const history = new Map<string, { role: string; content: string }[]>();
const QUOTA = 1_000;

export async function chat(userId: string, message: string) {
  const used = usage.get(userId) ?? 0;
  if (used >= QUOTA) throw new Error("quota_exceeded");
  const res = await complete(message);
  usage.set(userId, used + res.tokens);
  const thread = history.get(userId) ?? [];
  thread.push({ role: "user", content: message }, { role: "assistant", content: res.text });
  history.set(userId, thread);
  return { ...res, used: usage.get(userId), quota: QUOTA };
}

export function killPrimary() {
  setHealthy("primary", false);
}

export function getHistory(userId: string) {
  return history.get(userId) ?? [];
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { chat, killPrimary, getHistory } from "../src/server";
export async function runPublicTests() {
  const a = await chat("u1", "hello lumen");
  killPrimary();
  const b = await chat("u1", "still there?");
  return [
    { name: "streaming_chat_stub", pass: !!a.text },
    { name: "history", pass: getHistory("u1").length >= 2 },
    { name: "provider_fallback", pass: b.provider === "fallback" },
  ];
}
`,
      language: "typescript",
    },
  ];
}

function codewatchPack(): StarterFile[] {
  return [
    {
      path: "reviews/PR-01.ts",
      content: `/** Intentionally flawed PR — find and document issues in REVIEW.md */
export function compareToken(a: string, b: string) {
  // timing-safe? 
  return a === b;
}

export function verifyJwt(headerAlg: string, payload: unknown) {
  if (headerAlg === "none") return payload; // alg confusion lab
  return payload;
}
`,
      language: "typescript",
    },
    {
      path: "reviews/PR-02.ts",
      content: `let balance = 100;
/** Racey entitlement check */
export async function withdraw(amount: number) {
  if (balance >= amount) {
    await new Promise((r) => setTimeout(r, 1));
    balance -= amount;
    return true;
  }
  return false;
}
export function getBalance() {
  return balance;
}
`,
      language: "typescript",
    },
    {
      path: "docs/REVIEW.md",
      content: `# Secure code review log

| PR | Severity | Finding | Fix proposed | Test |
|----|----------|---------|--------------|------|
| PR-01 |  |  |  |  |
| PR-02 |  |  |  |  |
`,
      language: "markdown",
    },
    {
      path: "src/server.ts",
      content: `export function health() {
  return { ok: true, service: "codewatch-review" };
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import fs from "fs";
import { health } from "../src/server";
export async function runPublicTests() {
  return [
    { name: "health", pass: health().ok },
    { name: "review_log", pass: fs.existsSync("docs/REVIEW.md") },
    { name: "pr_fixtures", pass: fs.existsSync("reviews/PR-01.ts") },
  ];
}
`,
      language: "typescript",
    },
  ];
}
