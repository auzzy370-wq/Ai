"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatScore } from "@/lib/utils";

type AnalyticsData = {
  totalCandidates?: number;
  activeAssessments?: number;
  completedAssessments?: number;
  eliteQualified?: number;
  deploymentSuccessRate?: number;
  securityFailures?: number;
  averageScores?: Record<string, number>;
  failureRates?: { status: string; count: number }[];
  trackBreakdown?: { track: string; _count: number }[];
  cybersecurity?: { reports: number; elite: number; avgSecurity: number };
  softwareEngineering?: { reports: number; elite: number };
  tiers?: { elite: number; exceptional: number; distinguished: number };
  windowDays?: number;
  trends?: {
    assignmentsCreated?: { date: string; value: number }[];
    reportsScored?: { date: string; value: number }[];
    qualifiedPerDay?: { date: string; value: number }[];
  };
  scoreDistribution?: { label: string; count: number }[];
  authActivity?: Record<string, number>;
  topAssessments?: {
    title: string;
    count: number;
    track?: string | null;
    slug?: string | null;
    type?: string | null;
  }[];
  reviews?: Record<string, number>;
};

function BarRow({ label, value, max, mono }: { label: string; value: number; max: number; mono?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className={mono ? "font-mono text-xs text-slate-600" : "capitalize text-slate-600"}>{label}</span>
        <span className="font-mono text-slate-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-orange-500/70 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SparkBars({ points }: { points: { date: string; value: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  if (!points.length) {
    return <p className="text-sm text-slate-500">No activity in this window.</p>;
  }
  return (
    <div className="flex h-28 items-end gap-0.5">
      {points.map((p) => (
        <div key={p.date} className="group relative flex-1" title={`${p.date}: ${p.value}`}>
          <div
            className="w-full rounded-t-sm bg-orange-500/60 transition group-hover:bg-orange-300"
            style={{ height: `${Math.max(4, Math.round((p.value / max) * 100))}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPanel({ data, compact }: { data: AnalyticsData; compact?: boolean }) {
  const scores = data.averageScores ?? {};
  const scoreMax = Math.max(100, ...Object.values(scores).map(Number));
  const funnel = data.failureRates ?? [];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count));
  const dist = data.scoreDistribution ?? [];
  const distMax = Math.max(1, ...dist.map((d) => d.count));
  const tracks = data.trackBreakdown ?? [];
  const trackMax = Math.max(1, ...tracks.map((t) => t._count));

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Candidates", value: data.totalCandidates },
          { label: "Active assessments", value: data.activeAssessments },
          { label: "Completed", value: data.completedAssessments },
          { label: "Elite qualified", value: data.eliteQualified },
          { label: "Deploy success %", value: data.deploymentSuccessRate },
          { label: "Avg overall", value: formatScore(scores.overall ?? 0) },
          { label: "Security fails", value: data.securityFailures },
          { label: "Cyber elite", value: data.cybersecurity?.elite },
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
            <CardTitle>Category averages</CardTitle>
            <CardDescription>Evidence-weighted means across scored reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(scores)
              .filter(([k]) => k !== "overall")
              .map(([k, v]) => (
                <BarRow key={k} label={k} value={Number(v)} max={scoreMax} />
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment funnel</CardTitle>
            <CardDescription>Live counts by assignment status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.map((f) => (
              <BarRow key={f.status} label={f.status} value={f.count} max={funnelMax} mono />
            ))}
            {!funnel.length && <p className="text-sm text-slate-500">No assignments yet.</p>}
          </CardContent>
        </Card>
      </section>

      {!compact && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Assignments created</CardTitle>
              <CardDescription>Last {data.windowDays ?? 30} days</CardDescription>
            </CardHeader>
            <CardContent>
              <SparkBars points={data.trends?.assignmentsCreated ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Reports scored</CardTitle>
              <CardDescription>Last {data.windowDays ?? 30} days</CardDescription>
            </CardHeader>
            <CardContent>
              <SparkBars points={data.trends?.reportsScored ?? []} />
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
            <CardDescription>Overall scores in the analytics window</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dist.map((d) => (
              <BarRow key={d.label} label={d.label} value={d.count} max={distMax} mono />
            ))}
            {!dist.length && <p className="text-sm text-slate-500">No scored reports in window.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracks & qualification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {tracks.map((t) => (
                <BarRow key={t.track} label={t.track} value={t._count} max={trackMax} mono />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="brand">Elite {data.tiers?.elite ?? 0}</Badge>
              <Badge variant="violet">Exceptional {data.tiers?.exceptional ?? 0}</Badge>
              <Badge variant="amber">Distinguished {data.tiers?.distinguished ?? 0}</Badge>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                Cyber · {data.cybersecurity?.reports ?? 0} reports · {data.cybersecurity?.elite ?? 0} elite · avg
                security {formatScore(data.cybersecurity?.avgSecurity ?? 0)}
              </div>
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                Software eng · {data.softwareEngineering?.reports ?? 0} reports ·{" "}
                {data.softwareEngineering?.elite ?? 0} elite
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {!compact && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top assessments</CardTitle>
              <CardDescription>Highest assignment volume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.topAssessments ?? []).map((a) => (
                <div
                  key={`${a.title}-${a.slug}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.title}</div>
                    <div className="truncate font-mono text-[11px] text-slate-500">
                      {a.slug} · {a.type} · {a.track}
                    </div>
                  </div>
                  <span className="font-mono text-orange-800">{a.count}</span>
                </div>
              ))}
              {!(data.topAssessments ?? []).length && <p className="text-sm text-slate-500">No volume yet.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Reviews & auth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.reviews ?? {}).map(([k, v]) => (
                  <Badge key={k} variant={k === "APPROVE" ? "emerald" : k === "REJECT" ? "rose" : "amber"}>
                    {k} {v}
                  </Badge>
                ))}
                {!Object.keys(data.reviews ?? {}).length && (
                  <span className="text-slate-500">No human review decisions yet.</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(data.authActivity ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="font-mono text-[11px] text-slate-500">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
