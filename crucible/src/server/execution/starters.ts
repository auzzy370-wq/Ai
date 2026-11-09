import { codingStarterFiles } from "./coding-starters";
import { domainPackFiles, missionBriefFiles } from "./project-packs";
import { CHALLENGE_CATALOG } from "@/server/challenges/catalog";

export type StarterFile = { path: string; content: string; language?: string };

function mergeFiles(base: StarterFile[], overlay: StarterFile[]): StarterFile[] {
  const map = new Map<string, StarterFile>();
  for (const f of base) map.set(f.path, f);
  for (const f of overlay) map.set(f.path, f);
  return [...map.values()];
}

export function starterFilesForChallenge(slug: string, language: string, track: string): StarterFile[] {
  const coding = codingStarterFiles(slug, language, track);
  if (coding) return coding;

  const challenge = CHALLENGE_CATALOG.find((c) => c.slug === slug);
  const briefs = missionBriefFiles(slug, track, language);
  const domain = domainPackFiles(slug);

  const readme = `# ${slug}

**${challenge?.title ?? slug}**  
Track: **${track}** · Language: **${language}**

This is your isolated CRUCIBLE assessment workspace.

## Start here
1. Read \`BRIEF.md\` — objective, public deliverables, hidden bar, adaptive levels.
2. Work the \`CHECKLIST.md\` — tick evidence as you ship.
3. Implement in \`src/\`; keep \`docs/ARCHITECTURE.md\` honest.
4. **Run tests** → **Hidden tests** → **Verify deploy** → **Submit**.

## Rules
- Do not escape the sandbox or access platform secrets.
- AI tools are allowed; you own correctness and tradeoffs.
- Cyber labs: only attack provided lab targets — never external systems.
`;

  const common: StarterFile[] = [
    { path: "README.md", content: readme, language: "markdown" },
    ...briefs,
  ];

  if (slug === "appsec-fortress") {
    return mergeFiles(common, [
      ...appsecLabFiles(),
      ...domain,
    ]);
  }

  if (slug === "soc-nightwatch") {
    return mergeFiles(common, [
      ...socNightwatchFiles(),
      ...domain,
    ]);
  }

  if (track === "CYBERSECURITY") {
    return mergeFiles(common, [
      ...cyberDefaultFiles(slug),
      ...domain,
    ]);
  }

  // Software / secure full-stack — prefer domain pack server + shared harness
  const seBase = softwareDefaultFiles(slug);
  return mergeFiles(mergeFiles(common, seBase), domain);
}

function softwareDefaultFiles(slug: string): StarterFile[] {
  return [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: slug,
          private: true,
          type: "module",
          scripts: {
            test: "node --import tsx tests/run.ts",
            start: "node --import tsx src/server.ts",
          },
        },
        null,
        2,
      ),
      language: "json",
    },
    {
      path: "src/server.ts",
      content: `import http from "http";

const users = new Map<string, { email: string; password: string; role: string; orgId: string }>();

export function register(email: string, password: string, orgId: string) {
  if (users.has(email)) throw new Error("exists");
  users.set(email, { email, password, role: "member", orgId });
  return { email, orgId };
}

export function login(email: string, password: string) {
  const u = users.get(email);
  if (!u || u.password !== password) throw new Error("invalid");
  return { email: u.email, role: u.role, orgId: u.orgId, token: Buffer.from(email).toString("base64") };
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, slug: "${slug}" }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

if (process.env.RUN_SERVER === "1") server.listen(4060);

export { server, users };
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { register, login } from "../src/server";

export async function runPublicTests() {
  const results: { name: string; pass: boolean; hidden?: boolean }[] = [];
  try {
    register("a@ex.com", "pw", "org1");
    const session = login("a@ex.com", "pw");
    results.push({ name: "register_login", pass: session.orgId === "org1" });
  } catch {
    results.push({ name: "register_login", pass: false });
  }
  results.push({ name: "module_loads", pass: true });
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
            { id: "tenant-isolation", description: "Users cannot read other org resources" },
            { id: "idempotent-payment", description: "Duplicate payment intents do not double-charge" },
            { id: "failure-recovery", description: "Graceful degradation under dependency failure" },
          ],
        },
        null,
        2,
      ),
      language: "json",
    },
    {
      path: "tests/run.ts",
      content: `import { runPublicTests } from "./public.test";
const results = await runPublicTests();
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
      language: "typescript",
    },
    {
      path: "Dockerfile",
      content: `FROM node:20-alpine
WORKDIR /app
COPY . .
ENV RUN_SERVER=1
EXPOSE 4060
CMD ["node", "--import", "tsx", "src/server.ts"]
`,
      language: "dockerfile",
    },
  ];
}

function appsecLabFiles(): StarterFile[] {
  return [
    {
      path: "lab/server.ts",
      content: `/**
 * CONTROLLED VULNERABLE LAB — NOT FOR PRODUCTION
 * Identify, exploit in-lab only, fix, and add regression tests.
 */
import http from "http";
import { URL } from "url";

const users: Record<string, { id: string; role: string; password: string }> = {
  alice: { id: "1", role: "user", password: "alice" },
  admin: { id: "2", role: "admin", password: "admin" },
};

const orders: Record<string, { id: string; userId: string; total: number }> = {
  "100": { id: "100", userId: "1", total: 42 },
  "200": { id: "200", userId: "2", total: 99 },
};

const comments: { user: string; body: string }[] = [];

function parseQs(reqUrl: string) {
  return new URL(reqUrl, "http://lab.local");
}

const server = http.createServer(async (req, res) => {
  const u = parseQs(req.url || "/");
  if (u.pathname === "/search") {
    const q = u.searchParams.get("q") || "";
    const hit = Object.values(orders).filter(
      (o) => String(o.id).includes(q) || q.includes("' OR "),
    );
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ hit, note: "parameterize this filter" }));
    return;
  }
  if (u.pathname.startsWith("/orders/")) {
    const id = u.pathname.split("/")[2];
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(orders[id!] || null));
    return;
  }
  if (u.pathname === "/comments" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const data = JSON.parse(body || "{}");
      comments.push({ user: data.user || "anon", body: data.body || "" });
      res.writeHead(201, { "content-type": "text/html" });
      res.end(comments.map((c) => "<div>" + c.user + ": " + c.body + "</div>").join(""));
    });
    return;
  }
  if (u.pathname === "/preview") {
    const target = u.searchParams.get("url") || "";
    try {
      const r = await fetch(target);
      const text = await r.text();
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(text.slice(0, 500));
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
    return;
  }
  if (u.pathname === "/health") {
    res.writeHead(200);
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

if (process.env.RUN_SERVER === "1") server.listen(4050, () => console.log("lab on 4050"));
export { server, orders, comments };
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `export async function runPublicTests() {
  return [
    { name: "lab_server_present", pass: true },
    { name: "findings_doc_ready", pass: true },
  ];
}
`,
      language: "typescript",
    },
    {
      path: "tests/run.ts",
      content: `import { runPublicTests } from "./public.test";
const results = await runPublicTests();
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
      language: "typescript",
    },
    {
      path: "tests/hidden.manifest.json",
      content: JSON.stringify(
        {
          tests: [
            { id: "hidden-idor", description: "Order access requires ownership" },
            { id: "hidden-ssrf", description: "Block link-local/metadata IPs" },
            { id: "hidden-xss", description: "Comments escaped" },
          ],
        },
        null,
        2,
      ),
      language: "json",
    },
    {
      path: "docs/FINDINGS.md",
      content: `# Findings

| ID | Severity | Evidence | Fix | Regression |
|----|----------|----------|-----|------------|
| VULN-IDOR-01 |  |  |  |  |
| VULN-SSRF-01 |  |  |  |  |
| VULN-XSS-01 |  |  |  |  |
| VULN-SQLI-01 |  |  |  |  |
`,
      language: "markdown",
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "appsec-fortress",
          private: true,
          type: "module",
          scripts: { test: "node --import tsx tests/run.ts", lab: "RUN_SERVER=1 node --import tsx lab/server.ts" },
        },
        null,
        2,
      ),
      language: "json",
    },
    {
      path: "Dockerfile",
      content: `FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "--import", "tsx", "lab/server.ts"]
`,
      language: "dockerfile",
    },
  ];
}

function socNightwatchFiles(): StarterFile[] {
  return [
    {
      path: "telemetry/alerts.json",
      content: JSON.stringify(
        [
          { id: "A-100", severity: "high", rule: "Impossible travel login", entity: "user:jlee" },
          { id: "A-101", severity: "medium", rule: "Outbound DNS volume spike", entity: "host:api-3" },
          { id: "A-102", severity: "low", rule: "Failed sudo", entity: "host:bastion" },
          { id: "A-103", severity: "critical", rule: "Service token used from new ASN", entity: "svc:billing" },
        ],
        null,
        2,
      ),
      language: "json",
    },
    {
      path: "playbooks/IR_TEMPLATE.md",
      content: `# Incident Timeline

## Detection
## Triage / severity
## Containment
## Eradication
## Recovery
## Lessons learned
## Customer comms draft
`,
      language: "markdown",
    },
    {
      path: "detections/rules.yaml",
      content: `rules:
  - id: token-new-asn
    title: Service token from unfamiliar ASN
    severity: critical
    condition: "token.use AND new_asn == true"
    # Expand with unit-testable logic in src/detect.ts
`,
      language: "yaml",
    },
    {
      path: "src/detect.ts",
      content: `export type Alert = { id: string; severity: string; rule: string; entity: string };

export function prioritize(alerts: Alert[]) {
  const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...alerts].sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));
}

export function pickPrimary(alerts: Alert[]) {
  return prioritize(alerts)[0] ?? null;
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import fs from "fs";
import { prioritize, pickPrimary } from "../src/detect";

export async function runPublicTests() {
  const raw = fs.readFileSync("telemetry/alerts.json", "utf8");
  const alerts = JSON.parse(raw);
  const primary = pickPrimary(alerts);
  return [
    { name: "ir_template_present", pass: fs.existsSync("playbooks/IR_TEMPLATE.md") },
    { name: "alerts_load", pass: alerts.length >= 4 },
    { name: "priority_critical_first", pass: primary?.severity === "critical" },
    { name: "stable_sort", pass: prioritize(alerts)[0]?.id === primary?.id },
  ];
}
`,
      language: "typescript",
    },
    {
      path: "tests/run.ts",
      content: `import { runPublicTests } from "./public.test";
const results = await runPublicTests();
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
      language: "typescript",
    },
    {
      path: "package.json",
      content: JSON.stringify(
        { name: "soc-nightwatch", private: true, type: "module", scripts: { test: "node --import tsx tests/run.ts" } },
        null,
        2,
      ),
      language: "json",
    },
    {
      path: "Dockerfile",
      content: `FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "--import", "tsx", "tests/run.ts"]
`,
      language: "dockerfile",
    },
  ];
}

function cyberDefaultFiles(slug: string): StarterFile[] {
  const extras: StarterFile[] = [];
  if (slug === "cloud-bastion") {
    extras.push({
      path: "infra/baseline.tf",
      content: `# Harden this baseline — overly permissive for the lab
resource "aws_security_group" "wide_open" {
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
`,
      language: "hcl",
    });
  }
  if (slug === "detect-forge") {
    extras.push({
      path: "detections/sigma_stub.yml",
      content: `title: Suspicious token use
status: experimental
logsource:
  product: linux
detection:
  selection:
    EventID: 1
  condition: selection
`,
      language: "yaml",
    });
  }
  if (slug === "cipher-ops") {
    extras.push({
      path: "src/crypto_lab.ts",
      content: `// Broken constructions for the lab — replace with AEAD + vetted KDF
export function weakHash(pw: string) {
  return Buffer.from(pw).toString("hex");
}
`,
      language: "typescript",
    });
  }
  if (slug === "zero-trust-edge") {
    extras.push({
      path: "policy/access.json",
      content: JSON.stringify({ default: "allow", routes: [{ path: "/**", auth: "none" }] }, null, 2),
      language: "json",
    });
  }
  if (slug === "threat-lattice") {
    extras.push({
      path: "docs/DFD.md",
      content: `# Data-flow diagram notes\n\n1. External user\n2. Edge gateway\n3. App services\n4. Datastores\n`,
      language: "markdown",
    });
  }

  return [
    ...extras,
    {
      path: "src/main.ts",
      content: `// Cybersecurity assessment entrypoint (${slug})
export function health() {
  return { ok: true, track: "CYBERSECURITY", slug: "${slug}" };
}
`,
      language: "typescript",
    },
    {
      path: "tests/public.test.ts",
      content: `import { health } from "../src/main";
export async function runPublicTests() {
  const h = health();
  return [
    { name: "health", pass: !!h.ok },
    { name: "slug_bound", pass: h.slug === "${slug}" },
  ];
}
`,
      language: "typescript",
    },
    {
      path: "tests/run.ts",
      content: `import { runPublicTests } from "./public.test";
const results = await runPublicTests();
console.log(JSON.stringify({ results }));
process.exit(results.every((r) => r.pass) ? 0 : 1);
`,
      language: "typescript",
    },
    {
      path: "tests/hidden.manifest.json",
      content: JSON.stringify(
        {
          tests: [
            { id: "mitigation-evidence", description: "Primary mitigations implemented with tests" },
            { id: "no-critical-open", description: "No unresolved critical findings in lab scope" },
          ],
        },
        null,
        2,
      ),
      language: "json",
    },
    {
      path: "docs/THREAT_MODEL.md",
      content: `# Threat Model\n\n## Assets\n## Trust boundaries\n## STRIDE\n## Mitigations\n`,
      language: "markdown",
    },
    {
      path: "docs/FINDINGS.md",
      content: `# Findings\n\n| ID | Severity | Evidence | Fix |\n|----|----------|----------|-----|\n|    |          |          |     |\n`,
      language: "markdown",
    },
    {
      path: "package.json",
      content: JSON.stringify(
        { name: slug, private: true, type: "module", scripts: { test: "node --import tsx tests/run.ts" } },
        null,
        2,
      ),
      language: "json",
    },
    {
      path: "Dockerfile",
      content: `FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "--import", "tsx", "tests/run.ts"]
`,
      language: "dockerfile",
    },
  ];
}
