"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AdminCompetitionPanel } from "@/components/competition/admin-competition-panel";
import { cn, formatScore } from "@/lib/utils";

type Tab =
  | "overview"
  | "analytics"
  | "competition"
  | "users"
  | "assignments"
  | "library"
  | "integrity"
  | "jobs"
  | "ai"
  | "audit"
  | "system";

const ROLES = ["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER", "CANDIDATE", "TEAM_MEMBER"] as const;
const PLANS = ["FREE", "PREMIUM"] as const;
const ASSIGNMENT_STATUSES = [
  "ASSIGNED",
  "IN_PROGRESS",
  "SUBMITTED",
  "GRADING",
  "UNDER_REVIEW",
  "COMPLETED",
  "FAILED",
  "EXPIRED",
] as const;

export function AdminClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userQ, setUserQ] = useState("");
  const [userRole, setUserRole] = useState("All");
  const [jobs, setJobs] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [auditQ, setAuditQ] = useState("");
  const [providers, setProviders] = useState<any[]>([]);
  const [library, setLibrary] = useState<any>(null);
  const [libQ, setLibQ] = useState("");
  const [libPublished, setLibPublished] = useState("All");
  const [integrity, setIntegrity] = useState<any>(null);
  const [integrityDetail, setIntegrityDetail] = useState<any>(null);
  const [assignments, setAssignments] = useState<any>(null);
  const [assignQ, setAssignQ] = useState("");
  const [assignStatus, setAssignStatus] = useState("All");
  const [analytics, setAnalytics] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "Secondary OpenAI-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY",
  });

  async function loadOverview() {
    const res = await fetch("/api/admin/overview");
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Admin only");
    setOverview(json.data);
    setProviders(json.data.providers ?? []);
  }

  async function loadUsers() {
    const params = new URLSearchParams({ take: "80" });
    if (userQ.trim()) params.set("q", userQ.trim());
    if (userRole !== "All") params.set("role", userRole);
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    setUsers(json.data.users);
  }

  async function loadJobs() {
    const res = await fetch("/api/admin/jobs");
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    setJobs(json.data);
  }

  async function loadAudit() {
    const params = new URLSearchParams({ take: "100" });
    if (auditQ.trim()) params.set("q", auditQ.trim());
    const res = await fetch(`/api/admin/audit?${params}`);
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    setAudits(json.data.logs);
  }

  async function loadProviders() {
    const res = await fetch("/api/admin/ai-providers");
    const json = await res.json();
    if (json.ok) setProviders(json.data);
  }

  async function loadLibrary() {
    const params = new URLSearchParams({ take: "40" });
    if (libQ.trim()) params.set("q", libQ.trim());
    if (libPublished === "Published") params.set("published", "true");
    if (libPublished === "Draft") params.set("published", "false");
    try {
      const res = await fetch(`/api/admin/library?${params}`);
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error?.message || "Failed");
        return;
      }
      setLibrary(json.data);
    } catch {
      toast.error("Could not load library");
    }
  }

  async function loadAssignments() {
    const params = new URLSearchParams({ take: "60" });
    if (assignQ.trim()) params.set("q", assignQ.trim());
    if (assignStatus !== "All") params.set("status", assignStatus);
    const res = await fetch(`/api/admin/assignments?${params}`);
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    setAssignments(json.data);
  }

  async function loadAnalytics() {
    const res = await fetch("/api/admin/analytics");
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    setAnalytics(json.data);
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (tab === "users") void loadUsers();
    if (tab === "jobs") void loadJobs();
    if (tab === "audit") void loadAudit();
    if (tab === "ai") void loadProviders();
    if (tab === "overview") void loadOverview();
    if (tab === "library") void loadLibrary();
    if (tab === "integrity") void loadIntegrity();
    if (tab === "assignments") void loadAssignments();
    if (tab === "analytics") void loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadIntegrity() {
    try {
      const res = await fetch("/api/admin/challenge-integrity");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      setIntegrity(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Integrity load failed");
    }
  }

  async function scanIntegrityLibrary() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/challenge-integrity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "scan_library", take: 120, onlyPublished: false }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Scan failed");
      toast.success(
        `Scanned ${json.data.summary.scanned}: ${json.data.summary.pass} pass · ${json.data.summary.warn} warn · ${json.data.summary.fail} fail`,
      );
      await loadIntegrity();
      await loadLibrary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  async function scanOneChallenge(challengeId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/challenge-integrity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "scan", challengeId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Scan failed");
      setIntegrityDetail(json.data);
      toast.message(`Integrity ${json.data.status} · ${json.data.findings.length} findings`);
      await loadIntegrity();
      await loadLibrary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchUser(userId: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Update failed");
      toast.success("User updated");
      await loadUsers();
      await loadOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchChallenge(challengeId: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/library", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, ...patch }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Update failed");
      toast.success("Challenge updated");
      await loadLibrary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchAssignment(assignmentId: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignmentId, ...patch }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Update failed");
      toast.success("Assignment updated");
      await loadAssignments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function addProvider() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, enabled: true }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      toast.success("Provider added");
      await loadProviders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function drainJobs() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "drain_queued", limit: 25 }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      toast.success(`Draining ${json.data.drained} queued jobs`);
      await loadJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function retryJob(jobId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "retry_job", jobId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      toast.success("Job re-queued");
      await loadJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  // Competition / AI provider sprawl stays behind a flag until the core hiring loop is solid.
  const sprawl = process.env.NEXT_PUBLIC_ENABLE_ADMIN_SPRAWL === "true";
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
    ...(sprawl ? [{ id: "competition" as const, label: "Competition" }] : []),
    { id: "users", label: "Users" },
    { id: "assignments", label: "Assignments" },
    { id: "library", label: "Library" },
    { id: "integrity", label: "Integrity" },
    { id: "jobs", label: "Execution" },
    ...(sprawl ? [{ id: "ai" as const, label: "AI providers" }] : []),
    { id: "audit", label: "Audit log" },
    { id: "system", label: "System" },
  ];

  const a = overview?.analytics;

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">SUPER ADMIN</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Platform control plane</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          {sprawl
            ? "Users, assignments, challenge library, execution queue, competition/AI plane, audit trail, and system posture."
            : "Users, assignments, challenge library, execution queue, audit trail, and system posture. Core hiring loop: create → assign → complete → scorecard."}
        </p>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md border px-3 py-2 text-sm",
              tab === t.id
                ? "border-orange-400/50 bg-orange-500/10 text-orange-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && overview && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Candidates", value: a?.totalCandidates },
              { label: "Open assignments", value: overview.openAssignments },
              { label: "Workspaces", value: overview.workspaces },
              { label: "Elite qualified", value: a?.eliteQualified },
              { label: "Coding problems", value: overview.library.coding },
              { label: "Project missions", value: overview.library.projects },
              { label: "Published challenges", value: overview.library.challenges },
              { label: "Deploy success %", value: a?.deploymentSuccessRate },
            ].map((t) => (
              <Card key={t.label}>
                <CardContent className="pt-5">
                  <div className="text-xs uppercase tracking-wider text-slate-500">{t.label}</div>
                  <div className="mt-1 font-mono text-2xl text-slate-900">{t.value ?? "—"}</div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Users by role</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(overview.usersByRole ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-slate-600">{k}</span>
                    <span className="font-mono">{String(v)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Execution queue</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(overview.jobs ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-slate-600">{k}</span>
                    <span className="font-mono">{String(v)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(overview.recentUsers ?? []).map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.name}</div>
                      <div className="truncate font-mono text-[11px] text-slate-500">{u.email}</div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Badge>{u.role}</Badge>
                      <Badge variant={u.plan === "PREMIUM" ? "amber" : "brand"}>{u.plan}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Latest audit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(overview.recentAudits ?? []).map((l: any) => (
                  <div key={l.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <div className="font-mono text-xs text-orange-800">{l.action}</div>
                    <div className="text-slate-600">
                      {l.actor?.name ?? "system"} · {l.entityType}
                      {l.entityId ? ` · ${String(l.entityId).slice(0, 12)}` : ""}
                    </div>
                    <div className="font-mono text-[10px] text-slate-600">
                      {new Date(l.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/assessments" className="text-orange-700 hover:underline">
              Assessments →
            </Link>
            <Link href="/reviews" className="text-orange-700 hover:underline">
              Review queue →
            </Link>
            <Link href="/challenges" className="text-orange-700 hover:underline">
              Challenge bank →
            </Link>
          </div>
        </>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Platform analytics</h2>
            <p className="text-sm text-slate-600">
              Qualification funnel, score distributions, track health, and 30-day activity — Super Admin only.
            </p>
          </div>
          {analytics ? (
            <AnalyticsPanel data={analytics} />
          ) : (
            <p className="text-slate-600">Loading analytics…</p>
          )}
        </div>
      )}

      {tab === "competition" && <AdminCompetitionPanel />}

      {tab === "users" && (
        <Card>
          <CardHeader>
            <CardTitle>User directory</CardTitle>
            <CardDescription>Change roles and plans. Demoting yourself is blocked.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Search name or email…"
                value={userQ}
                onChange={(e) => setUserQ(e.target.value)}
                className="sm:max-w-sm"
              />
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
              >
                <option value="All">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => void loadUsers()}>
                Search
              </Button>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{u.name}</div>
                      <div className="truncate font-mono text-xs text-slate-500">{u.email}</div>
                      <div className="mt-1 font-mono text-[11px] text-slate-600">
                        {u._count.assignments} assignments · {u._count.reviews} reviews · {u._count.sessions} sessions
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="h-10 rounded-md border border-slate-300 bg-white px-2 text-xs"
                        value={u.role}
                        disabled={busy}
                        onChange={(e) => void patchUser(u.id, { role: e.target.value })}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 rounded-md border border-slate-300 bg-white px-2 text-xs"
                        value={u.plan}
                        disabled={busy}
                        onChange={(e) => void patchUser(u.id, { plan: e.target.value })}
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {!users.length && <p className="text-slate-500">No users match.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "assignments" && (
        <div className="space-y-4">
          {assignments && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(assignments.byStatus ?? {}).map(([k, v]) => (
                <Badge key={k} variant="brand">
                  {k} {String(v)}
                </Badge>
              ))}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Assignment console</CardTitle>
              <CardDescription>Override status or due dates when hiring ops need it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Search candidate or assessment…"
                  value={assignQ}
                  onChange={(e) => setAssignQ(e.target.value)}
                  className="sm:max-w-sm"
                />
                <select
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={assignStatus}
                  onChange={(e) => setAssignStatus(e.target.value)}
                >
                  <option value="All">All statuses</option>
                  {ASSIGNMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={() => void loadAssignments()}>
                  Search
                </Button>
              </div>
              <div className="space-y-2">
                {(assignments?.assignments ?? []).map((row: any) => (
                  <div key={row.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="font-medium text-slate-900">{row.assessment.title}</div>
                        <div className="text-slate-600">
                          {row.candidate.name} ·{" "}
                          <span className="font-mono text-xs">{row.candidate.email}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-600">
                          {row.assessment.challenge.slug} · level {row.currentLevel}/{row.maxLevelReached} · assigned by{" "}
                          {row.assignedBy.name}
                          {row.scoreReport?.overall != null
                            ? ` · score ${formatScore(row.scoreReport.overall)}`
                            : ""}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {row.workspace?.id && (
                            <Link
                              href={`/workspace/${row.workspace.id}`}
                              className="text-xs text-orange-700 hover:underline"
                            >
                              Workspace →
                            </Link>
                          )}
                          <Link href={`/scorecards/${row.id}`} className="text-xs text-orange-700 hover:underline">
                            Scorecard →
                          </Link>
                        </div>
                      </div>
                      <select
                        className="h-10 rounded-md border border-slate-300 bg-white px-2 text-xs"
                        value={row.status}
                        disabled={busy}
                        onChange={(e) => void patchAssignment(row.id, { status: e.target.value })}
                      >
                        {ASSIGNMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {!(assignments?.assignments ?? []).length && <p className="text-slate-500">No assignments.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "library" && (
        <div className="space-y-4">
          {library && (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {Object.entries(library.counts ?? {}).map(([k, v]) => (
                <Card key={k}>
                  <CardContent className="pt-4">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
                    <div className="font-mono text-xl">{String(v)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Challenge library</CardTitle>
              <CardDescription>
                Publish is gated by the Challenge Integrity Engine — errors must clear (or force) before release.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Input
                  placeholder="Search title or slug…"
                  value={libQ}
                  onChange={(e) => setLibQ(e.target.value)}
                  className="sm:max-w-sm"
                />
                <select
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={libPublished}
                  onChange={(e) => setLibPublished(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
                <Button variant="secondary" onClick={() => void loadLibrary()}>
                  Search
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => void scanIntegrityLibrary()}>
                  Scan integrity
                </Button>
                <Link href="/challenges" className="self-center text-sm text-orange-700 hover:underline">
                  Open bank →
                </Link>
              </div>
              <div className="space-y-2">
                {!library && <p className="text-slate-500">Loading challenge library…</p>}
                {(library?.challenges ?? []).map((c: any) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{c.title}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {c.slug} · {c.type} · {c.track} · {c._count.assessments} assessments
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(c.tags ?? []).slice(0, 4).map((t: string) => (
                            <Badge key={t}>{t}</Badge>
                          ))}
                          {c.isPublished ? <Badge variant="emerald">published</Badge> : <Badge variant="amber">draft</Badge>}
                          {c.isPremium && <Badge variant="amber">premium</Badge>}
                          {c.integrityStatus && c.integrityStatus !== "unknown" && (
                            <Badge
                              variant={
                                c.integrityStatus === "pass"
                                  ? "emerald"
                                  : c.integrityStatus === "fail"
                                    ? "rose"
                                    : "amber"
                              }
                            >
                              integrity:{c.integrityStatus}
                            </Badge>
                          )}
                          {c.calibratedDifficulty != null && (
                            <Badge variant="brand">
                              labeled {c.difficulty} · cal {c.calibratedDifficulty}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void scanOneChallenge(c.id)}
                        >
                          Scan
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void patchChallenge(c.id, { isPublished: !c.isPublished })}
                        >
                          {c.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void patchChallenge(c.id, { isPremium: !c.isPremium })}
                        >
                          {c.isPremium ? "Make free" : "Make premium"}
                        </Button>
                        <select
                          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                          value={c.difficulty}
                          disabled={busy}
                          onChange={(e) => void patchChallenge(c.id, { difficulty: Number(e.target.value) })}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                            <option key={d} value={d}>
                              Diff {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                {library && !(library.challenges ?? []).length && <p className="text-slate-500">No challenges.</p>}
              </div>

              {integrityDetail && (
                <div className="rounded-xl border border-slate-200 bg-white/75 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">
                      Last scan · {integrityDetail.slug} ·{" "}
                      <span
                        className={cn(
                          integrityDetail.status === "pass"
                            ? "text-emerald-300"
                            : integrityDetail.status === "fail"
                              ? "text-rose-700"
                              : "text-amber-800",
                        )}
                      >
                        {integrityDetail.status}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setIntegrityDetail(null)}>
                      Dismiss
                    </Button>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    version {integrityDetail.contentVersion}
                    {integrityDetail.liveAcceptancePct != null
                      ? ` · live acc ${integrityDetail.liveAcceptancePct}%`
                      : ""}
                    {integrityDetail.avgRuntimeMs != null ? ` · avg ${integrityDetail.avgRuntimeMs}ms` : ""}
                  </p>
                  <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                    {(integrityDetail.findings ?? []).map((f: any, i: number) => (
                      <li
                        key={`${f.code}-${i}`}
                        className={cn(
                          "rounded border px-2 py-1.5 font-mono text-[11px]",
                          f.severity === "error"
                            ? "border-rose-500/30 text-rose-100"
                            : f.severity === "warning"
                              ? "border-amber-500/30 text-amber-50"
                              : "border-slate-200 text-slate-600",
                        )}
                      >
                        [{f.severity}] {f.code}: {f.message}
                      </li>
                    ))}
                    {!(integrityDetail.findings ?? []).length && (
                      <li className="text-slate-500">No findings — publishable.</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <h3 className="mb-3 text-sm font-medium text-slate-800">Recent assessments</h3>
                <div className="space-y-2">
                  {(library?.assessments ?? []).map((a: any) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{a.title}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {a.challenge.slug} · {a._count.assignments} assignments
                        </div>
                      </div>
                          <Badge variant={a.status === "PUBLISHED" ? "emerald" : "amber"}>{a.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "integrity" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Challenge Integrity Engine</CardTitle>
              <CardDescription>
                Detects mismatched statements/tests, bad reference solutions, duplicate or contradictory cases,
                unrealistic difficulty, missing edges, hidden-test leakage, and nondeterministic harnesses. Publish
                stays blocked while status is fail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => void scanIntegrityLibrary()}>
                  Scan library (120)
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => void loadIntegrity()}>
                  Refresh
                </Button>
              </div>
              {integrity && (
                <div className="grid gap-3 sm:grid-cols-4">
                  {["pass", "warn", "fail", "unknown"].map((k) => (
                    <div key={k} className="rounded-xl border border-slate-200 px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
                      <div className="font-mono text-xl text-slate-900">{integrity.counts?.[k] ?? 0}</div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-800">Needs attention</h3>
                <div className="space-y-2">
                  {!integrity && <p className="text-slate-500">Loading…</p>}
                  {(integrity?.worst ?? []).map((c: any) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{c.title}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {c.slug} · labeled {c.difficulty}
                          {c.calibratedDifficulty != null ? ` · cal ${c.calibratedDifficulty}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            c.integrityStatus === "fail" ? "rose" : c.integrityStatus === "warn" ? "amber" : "brand"
                          }
                        >
                          {c.integrityStatus}
                        </Badge>
                        {c.isPublished && <Badge variant="emerald">published</Badge>}
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void scanOneChallenge(c.id)}>
                          Re-scan
                        </Button>
                      </div>
                    </div>
                  ))}
                  {integrity && !(integrity.worst ?? []).length && (
                    <p className="text-slate-500">No fail/warn challenges yet — run a library scan.</p>
                  )}
                </div>
              </div>
              {integrityDetail && (
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm">
                  <div className="font-medium">
                    {integrityDetail.slug} · {integrityDetail.status}
                  </div>
                  <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto font-mono text-[11px]">
                    {(integrityDetail.findings ?? []).map((f: any, i: number) => (
                      <li key={`${f.code}-${i}`}>
                        [{f.severity}] {f.code}: {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "jobs" && jobs && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="brand">queued {jobs.queued}</Badge>
              <Badge variant="amber">running {jobs.running}</Badge>
              <Badge>mode {jobs.executionMode}</Badge>
            </div>
            <Button disabled={busy} onClick={() => void drainJobs()}>
              Drain queued (25)
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent execution jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(jobs.recent ?? []).map((j: any) => (
                <div
                  key={j.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{j.type}</Badge>
                      <Badge
                        variant={
                          j.status === "SUCCEEDED"
                            ? "emerald"
                            : j.status === "FAILED"
                              ? "rose"
                              : j.status === "QUEUED"
                                ? "amber"
                                : "brand"
                        }
                      >
                        {j.status}
                      </Badge>
                      {j.priority > 0 && <Badge variant="amber">P{j.priority}</Badge>}
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-slate-500">{j.command}</div>
                    <div className="font-mono text-[10px] text-slate-600">
                      {new Date(j.createdAt).toLocaleString()}
                      {j.exitCode != null ? ` · exit ${j.exitCode}` : ""}
                    </div>
                  </div>
                  {(j.status === "FAILED" || j.status === "TIMEOUT") && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => void retryJob(j.id)}>
                      Retry
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "ai" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Configured providers</CardTitle>
              <CardDescription>Keys stay in env vars — never stored in the database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {providers.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="font-medium">{p.name}</div>
                  <div className="font-mono text-xs text-slate-500">
                    {p.model} · {p.baseUrl}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {p.isDefault && <Badge variant="brand">default</Badge>}
                    <Badge variant={p.enabled ? "emerald" : "amber"}>{p.enabled ? "enabled" : "disabled"}</Badge>
                    <Badge variant={p.apiKeyConfigured ? "emerald" : "amber"}>
                      {p.apiKeyConfigured ? `env ${p.apiKeyEnv}` : "mock fallback"}
                    </Badge>
                  </div>
                </div>
              ))}
              {!providers.length && <p className="text-slate-500">No providers yet — add one or rely on mock AI.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>API key env var name</Label>
                <select
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  value={form.apiKeyEnv}
                  onChange={(e) => setForm({ ...form, apiKeyEnv: e.target.value })}
                >
                  {[
                    "OPENAI_API_KEY",
                    "GROQ_API_KEY",
                    "OPENROUTER_API_KEY",
                    "ANTHROPIC_API_KEY",
                    "AZURE_OPENAI_API_KEY",
                    "TOGETHER_API_KEY",
                    "FIREWORKS_API_KEY",
                  ].map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <Button disabled={busy} onClick={() => void addProvider()}>
                Save provider
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle>Audit trail</CardTitle>
            <CardDescription>Auth, settings, assignments, execution, reviews, and admin actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Filter action / entity…"
                value={auditQ}
                onChange={(e) => setAuditQ(e.target.value)}
                className="sm:max-w-sm"
              />
              <Button variant="secondary" onClick={() => void loadAudit()}>
                Search
              </Button>
            </div>
            <div className="space-y-2">
              {audits.map((l) => (
                <div key={l.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-orange-800">{l.action}</span>
                    <Badge>{l.entityType}</Badge>
                  </div>
                  <div className="mt-1 text-slate-600">
                    {l.actor ? `${l.actor.name} (${l.actor.role})` : "system"}
                    {l.entityId ? ` · ${l.entityId}` : ""}
                  </div>
                  {l.metadata && (
                    <pre className="mt-1 overflow-x-auto font-mono text-[10px] text-slate-600">
                      {JSON.stringify(l.metadata)}
                    </pre>
                  )}
                  <div className="font-mono text-[10px] text-slate-600">{new Date(l.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {!audits.length && <p className="text-slate-500">No audit rows.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "system" && overview && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment & integrations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {Object.entries(overview.system ?? {}).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-slate-500">{k}</span>
                  <span className="font-mono text-slate-800">{String(v)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Security posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>
                Candidate code runs in disposable sandboxes with CPU/memory/timeouts and restricted networking. Docker
                sockets must not be exposed to candidate workloads. Controlled-vuln labs stay isolated and never target
                external systems.
              </p>
              <p>
                Session cookies are HTTP-only. Résumé uploads validate PDF magic bytes and size. Audit logs cover auth,
                settings, assignment, execution, review, and admin mutations. Scores assist humans — they never hire
                alone.
              </p>
              <p>
                Avg overall score across reports:{" "}
                <span className="font-mono text-orange-800">{formatScore(a?.averageScores?.overall ?? 0)}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick ops links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              <Link href="/assessments" className="text-orange-700 hover:underline">
                Assessments →
              </Link>
              <Link href="/candidates" className="text-orange-700 hover:underline">
                Candidates →
              </Link>
              <Link href="/reviews" className="text-orange-700 hover:underline">
                Reviews →
              </Link>
              <Link href="/teams" className="text-orange-700 hover:underline">
                Teams →
              </Link>
              <Link href="/architecture" className="text-orange-700 hover:underline">
                Architecture →
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "overview" && !overview && <p className="text-slate-600">Loading control plane…</p>}
    </div>
  );
}
