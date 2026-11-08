"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LiveRow = {
  assignmentId: string;
  title: string;
  email: string;
  phase: "queued" | "running" | "done" | "error";
  overall: number | null;
  tests?: { public: string; hidden: string; deploy: string };
  error?: string;
};

export function AdminCompetitionPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [liveRows, setLiveRows] = useState<LiveRow[]>([]);
  const cancelRef = useRef(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/competition/analytics");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      setData(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function patchRow(assignmentId: string, patch: Partial<LiveRow>) {
    setLiveRows((prev) => prev.map((r) => (r.assignmentId === assignmentId ? { ...r, ...patch } : r)));
  }

  async function runAllAndPostScores() {
    cancelRef.current = false;
    setRunning(true);
    setLastRun(null);
    try {
      const listRes = await fetch("/api/admin/assessments/auto-run/targets");
      const listJson = await listRes.json();
      if (!listJson.ok) throw new Error(listJson.error?.message || "Could not load targets");
      const targets = (listJson.data.targets ?? []) as {
        assignmentId: string;
        assessmentTitle: string;
        candidateEmail: string;
      }[];

      if (!targets.length) {
        toast.message("No assignment workspaces to run");
        return;
      }

      setProgress({ done: 0, total: targets.length });
      setLiveRows(
        targets.map((t) => ({
          assignmentId: t.assignmentId,
          title: t.assessmentTitle,
          email: t.candidateEmail,
          phase: "queued",
          overall: null,
        })),
      );

      let posted = 0;
      let failed = 0;

      for (let i = 0; i < targets.length; i++) {
        if (cancelRef.current) break;
        const t = targets[i]!;
        patchRow(t.assignmentId, { phase: "running" });

        try {
          const res = await fetch("/api/admin/assessments/auto-run/one", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ assignmentId: t.assignmentId }),
          });
          const json = await res.json();
          if (!json.ok) throw new Error(json.error?.message || "Suite failed");
          const row = json.data as {
            overall: number | null;
            tests: { public: string; hidden: string; deploy: string };
            error?: string;
          };
          if (row.error) {
            failed += 1;
            patchRow(t.assignmentId, {
              phase: "error",
              overall: row.overall,
              tests: row.tests,
              error: row.error,
            });
          } else {
            posted += 1;
            patchRow(t.assignmentId, {
              phase: "done",
              overall: row.overall,
              tests: row.tests,
            });
          }
        } catch (e) {
          failed += 1;
          patchRow(t.assignmentId, {
            phase: "error",
            error: e instanceof Error ? e.message : "Failed",
          });
        }

        setProgress({ done: i + 1, total: targets.length });
      }

      const summary = cancelRef.current
        ? `Stopped early · posted ${posted}/${targets.length}`
        : `Finished · ran full suites on ${targets.length} · posted ${posted} scores${failed ? ` · ${failed} errors` : ""}`;
      setLastRun(summary);
      toast.success(summary);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto-run failed");
    } finally {
      setRunning(false);
    }
  }

  function stopRun() {
    cancelRef.current = true;
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading && !data) return <p className="text-slate-500">Loading competition analytics…</p>;
  if (!data) return null;

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium text-slate-900">Competition analytics</h2>
          <p className="text-xs text-slate-500">
            Live frontend runner · public + hidden + deploy on every assignment, then post scores
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={running} onClick={() => void runAllAndPostScores()}>
            {running ? `Running ${progress.done}/${progress.total}…` : "Auto-run all & post scores"}
          </Button>
          {running && (
            <Button size="sm" variant="secondary" onClick={stopRun}>
              Stop
            </Button>
          )}
          <Button size="sm" variant="secondary" disabled={running} onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>

      {running && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-600">
            <span>
              Suite progress {progress.done}/{progress.total}
            </span>
            <span className="font-mono">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-orange-500/80 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {lastRun && <p className="text-xs text-emerald-300/90">{lastRun}</p>}

      {liveRows.length > 0 && (
        <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 text-xs">
          <table className="w-full">
            <thead className="sticky top-0 bg-white text-slate-500">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Assessment</th>
                <th className="px-2 py-1 text-left font-normal">Phase</th>
                <th className="px-2 py-1 text-left font-normal">Tests</th>
                <th className="px-2 py-1 text-right font-normal">Score</th>
              </tr>
            </thead>
            <tbody>
              {liveRows.map((r) => (
                <tr
                  key={r.assignmentId}
                  className={`border-t border-slate-900 ${
                    r.phase === "running" ? "bg-orange-500/5 text-orange-50" : "text-slate-700"
                  }`}
                >
                  <td className="px-2 py-1">
                    <div>{r.title}</div>
                    <div className="font-mono text-[10px] text-slate-500">{r.email}</div>
                  </td>
                  <td className="px-2 py-1">
                    <Badge
                      variant={
                        r.phase === "done" ? "emerald" : r.phase === "error" ? "rose" : r.phase === "running" ? "brand" : undefined
                      }
                    >
                      {r.phase}
                    </Badge>
                  </td>
                  <td className="px-2 py-1 font-mono text-[10px]">
                    {r.phase === "running"
                      ? "public → hidden → deploy…"
                      : r.tests
                        ? `pub ${r.tests.public} · hid ${r.tests.hidden} · dep ${r.tests.deploy}`
                        : r.error
                          ? r.error.slice(0, 48)
                          : "queued"}
                  </td>
                  <td className="px-2 py-1 text-right font-mono">
                    {r.error && r.phase === "error" ? (
                      <span className="text-rose-700">err</span>
                    ) : (
                      r.overall ?? "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Challenges", data.totals.challenges],
          ["Research Frontier", data.totals.researchFrontier],
          ["Submissions", data.totals.submissions],
          ["Tournaments", data.totals.tournaments],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-slate-200 px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-1 font-mono text-xl text-orange-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm">
          <div className="font-medium text-slate-800">Human success</div>
          <div className="mt-1 font-mono text-2xl text-emerald-300">
            {data.human.successRatePct ?? "—"}%
          </div>
          <p className="mt-1 text-xs text-slate-500">{data.human.note}</p>
        </div>
        <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            AI success
            {data.ai.verifiedPool ? (
              <Badge variant="emerald">verified</Badge>
            ) : (
              <Badge variant="amber">experimental</Badge>
            )}
          </div>
          <div className="mt-1 font-mono text-2xl text-violet-300">
            {data.ai.successRatePct ?? "—"}%
          </div>
          <p className="mt-1 text-xs text-slate-500">{data.ai.note}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">By difficulty</p>
        <div className="flex flex-wrap gap-1">
          {(data.byDifficulty ?? []).map((d: any) => (
            <Badge key={d.difficulty}>
              D{d.difficulty}: {d.count}
            </Badge>
          ))}
        </div>
      </div>

      {(data.hardest ?? []).length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Hardest published</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {data.hardest.map((c: any) => (
              <li key={c.slug}>
                D{c.difficulty} · {c.title}{" "}
                <span className="font-mono text-[10px] text-slate-500">{c.integrityStatus}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.totals.integrityFailures > 0 && (
        <p className="text-sm text-amber-300">
          {data.totals.integrityFailures} challenges with integrityStatus=fail — publish gate should block these.
        </p>
      )}
    </section>
  );
}
