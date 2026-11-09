/**
 * End-to-end workflow verification for CRUCIBLE.
 * Exercises: admin assessment exists → candidate login → assign → workspace → commit → tests → submit → review.
 */
const BASE = process.env.APP_URL || "http://localhost:3847";

type Jar = Map<string, string>;

function storeCookies(jar: Jar, res: Response) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k && v) jar.set(k.trim(), v.trim());
  }
}

function cookieHeader(jar: Jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(jar: Jar, path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      cookie: cookieHeader(jar),
      ...(init.headers || {}),
    },
  });
  storeCookies(jar, res);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function login(email: string, password: string) {
  const jar: Jar = new Map();
  const { res, json } = await api(jar, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!json.ok) throw new Error(`login failed for ${email}: ${JSON.stringify(json)}`);
  return { jar, user: json.data, status: res.status };
}

async function main() {
  console.log("E2E against", BASE);

  const admin = await login("admin@crucible.local", process.env.DEMO_ADMIN_PASSWORD || "");
  console.log("✓ admin login");

  const hiring = await login("hiring@crucible.local", process.env.DEMO_ADMIN_PASSWORD || "");
  console.log("✓ hiring manager login");

  const { json: assessments } = await api(hiring.jar, "/api/assessments");
  if (!assessments.ok || !assessments.data.length) throw new Error("no assessments");
  const cyber = assessments.data.find((a: any) => a.track === "CYBERSECURITY") || assessments.data[0];
  console.log("✓ assessments listed", cyber.title);

  const { json: candidates } = await api(hiring.jar, "/api/candidates");
  if (!candidates.ok) throw new Error("candidates forbidden/failed");
  const candidate = candidates.data.find((c: any) => c.email === "cyber@crucible.local") || candidates.data[0];

  const { json: assignment } = await api(hiring.jar, "/api/assignments", {
    method: "POST",
    body: JSON.stringify({ assessmentId: cyber.id, candidateId: candidate.id, language: "typescript" }),
  });
  if (!assignment.ok) throw new Error(`assign failed: ${JSON.stringify(assignment)}`);
  console.log("✓ assignment + workspace", assignment.data.id);

  const cand = await login("cyber@crucible.local", process.env.DEMO_CANDIDATE_PASSWORD || "");
  const workspaceId = assignment.data.workspace.id;

  await api(cand.jar, `/api/assignments/${assignment.data.id}`, {
    method: "POST",
    body: JSON.stringify({ action: "start" }),
  });
  console.log("✓ candidate started assignment");

  await api(cand.jar, `/api/workspace/${workspaceId}/files`, {
    method: "PUT",
    body: JSON.stringify({
      path: "docs/FINDINGS.md",
      content: "# Findings\nFixed IDOR with ownership checks. Added SSRF allowlist.\n",
    }),
  });
  console.log("✓ candidate edited files");

  const { json: commit } = await api(cand.jar, `/api/workspace/${workspaceId}/commit`, {
    method: "POST",
    body: JSON.stringify({ message: "fix: harden lab endpoints" }),
  });
  if (!commit.ok) throw new Error("commit failed");
  console.log("✓ commit", commit.data.sha);

  const { json: submission } = await api(cand.jar, `/api/assignments/${assignment.data.id}/submit`, {
    method: "POST",
    body: JSON.stringify({ notes: "Cyber lab submission" }),
  });
  if (!submission.ok) throw new Error(`submit failed: ${JSON.stringify(submission)}`);
  console.log("✓ submit + AI evaluate overall=", submission.data.report?.overall);

  // Architecture + incident for mandatory gates (cyber team optional)
  await api(cand.jar, "/api/architecture", {
    method: "POST",
    body: JSON.stringify({
      assignmentId: assignment.data.id,
      proposal:
        "Trust boundaries between lab harness and grader. Multi-tenant isolation via org_id in every query. Payment provider failures use idempotency keys and outbox. Migrations use expand/contract. Regional outage: multi-AZ failover. 100,000 concurrent users via horizontal pods + Redis. Video pipeline with queued workers.",
      diagrams: {},
      answers: {
        "How would you support 100,000 concurrent users?": "Horizontal scale + caching",
        "What happens if a payment provider fails during checkout?": "Idempotent retry + outbox",
      },
    }),
  });
  console.log("✓ architecture submission");

  await api(cand.jar, "/api/incidents", {
    method: "POST",
    body: JSON.stringify({ action: "start", scenarioSlug: "token-exfil-beacon", assignmentId: assignment.data.id }),
  });
  const { json: incidents } = await api(cand.jar, "/api/incidents");
  const run = incidents.data.runs[0];
  await api(cand.jar, "/api/incidents", {
    method: "POST",
    body: JSON.stringify({
      runId: run.id,
      diagnosis: "CI secret echoed to logs and harvested",
      rootCauseFound: true,
      fixApplied: true,
      regressionTests: true,
      recovered: true,
      preventionDoc: "Secret scanning + log redaction + token rotation",
      timelineEvent: "recovered",
    }),
  });
  console.log("✓ incident recovery");

  const reviewer = await login("reviewer@crucible.local", process.env.DEMO_ADMIN_PASSWORD || "");
  const { json: review } = await api(reviewer.jar, "/api/reviews", {
    method: "POST",
    body: JSON.stringify({
      assignmentId: assignment.data.id,
      decision: "APPROVE",
      reasoning:
        "Verified lab hardening notes, architecture practicality, incident recovery evidence, and automated report. Approving for cybersecurity track with documented residual risk acceptance.",
      verifiedSkills: ["appsec", "incident-response"],
    }),
  });
  if (!review.ok) throw new Error(`review failed: ${JSON.stringify(review)}`);
  console.log("✓ human review approve");

  const { json: analytics } = await api(admin.jar, "/api/analytics");
  if (!analytics.ok) throw new Error("analytics failed");
  console.log("✓ analytics", {
    candidates: analytics.data.totalCandidates,
    cyberReports: analytics.data.cybersecurity.reports,
  });

  console.log("\nE2E PASSED — core qualification workflow OK (including cybersecurity track).");
}

main().catch((err) => {
  console.error("E2E FAILED", err);
  process.exit(1);
});
