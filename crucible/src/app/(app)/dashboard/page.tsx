import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { platformAnalytics } from "@/server/analytics/service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatScore } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const isStaff = ["SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"].includes(user.role);

  if (!isStaff) redirect("/learn");

  const analytics = await platformAnalytics();

  const tiles = [
    { label: "Candidates", value: analytics.totalCandidates },
    { label: "Active assessments", value: analytics.activeAssessments },
    { label: "Completed", value: analytics.completedAssessments },
    { label: "Elite qualified", value: analytics.eliteQualified },
    { label: "Deploy success %", value: analytics.deploymentSuccessRate },
    { label: "Avg overall", value: formatScore(analytics.averageScores.overall) },
    { label: "Cyber reports", value: analytics.cybersecurity.reports },
    { label: "Cyber elite", value: analytics.cybersecurity.elite },
  ];

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-700">HIRING PATH</p>
          <h1 className="mt-2 font-serif-display text-2xl tracking-tight sm:text-3xl">Test who can ship</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Use the same arena learners train in — assign timed work, review evidence, hire on proof.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">27 tracks</Badge>
          <Badge variant="violet">Industry + systems</Badge>
          <Badge variant="emerald">Shared judges</Badge>
        </div>
      </header>

      <section className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-orange-700/80">Candidate testing loop</div>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          <li className="rounded-xl border border-slate-200 bg-white/75 p-4">
            <div className="font-mono text-xs text-slate-500">1 · Assign</div>
            <div className="mt-1 font-medium text-slate-900">Create a timed test</div>
            <p className="mt-1 text-sm text-slate-600">Pick from the bank, set the clock, provision a workspace.</p>
            <Link href="/assessments" className="mt-3 inline-block text-sm text-orange-700 hover:underline">
              Open assessments →
            </Link>
          </li>
          <li className="rounded-xl border border-slate-200 bg-white/75 p-4">
            <div className="font-mono text-xs text-slate-500">2 · Observe</div>
            <div className="mt-1 font-medium text-slate-900">Watch real evidence</div>
            <p className="mt-1 text-sm text-slate-600">Candidates build in isolated IDEs against public + hidden judges.</p>
            <Link href="/candidates" className="mt-3 inline-block text-sm text-orange-700 hover:underline">
              Browse candidates →
            </Link>
          </li>
          <li className="rounded-xl border border-slate-200 bg-white/75 p-4">
            <div className="font-mono text-xs text-slate-500">3 · Decide</div>
            <div className="mt-1 font-medium text-slate-900">Human hire review</div>
            <p className="mt-1 text-sm text-slate-600">AI assists — you qualify, hold, or reject with reasoning.</p>
            <Link href="/reviews" className="mt-3 inline-block text-sm text-orange-700 hover:underline">
              Open review queue →
            </Link>
          </li>
        </ol>
        <div className="mt-4">
          <Link href="/analytics" className="text-sm text-orange-700 hover:underline">
            Open hiring analytics →
          </Link>
          {user.role === "SUPER_ADMIN" && (
            <>
              <span className="mx-2 text-slate-600">·</span>
              <Link href="/admin" className="text-sm text-orange-700 hover:underline">
                Control plane →
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-slate-500">{t.label}</div>
              <div className="mt-2 font-mono text-3xl text-slate-900">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category averages</CardTitle>
            <CardDescription>Evidence-weighted category means across scored submissions</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(analytics.averageScores)
              .filter(([k]) => k !== "overall")
              .map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="capitalize text-slate-600">{k}</span>
                  <span className="font-mono text-slate-900">{formatScore(v as number)}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Track health</CardTitle>
            <CardDescription>Cybersecurity vs software engineering throughput</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="font-medium text-violet-200">Cybersecurity</div>
              <p className="mt-1 text-slate-600">
                {analytics.cybersecurity.reports} reports · {analytics.cybersecurity.elite} elite · avg security{" "}
                {formatScore(analytics.cybersecurity.avgSecurity)}
              </p>
            </div>
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="font-medium text-orange-800">Software Engineering</div>
              <p className="mt-1 text-slate-600">
                {analytics.softwareEngineering.reports} reports · {analytics.softwareEngineering.elite} elite
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/challenges?track=CYBERSECURITY" className="text-violet-300 hover:underline">
                Cyber challenge library →
              </Link>
              <Link href="/assessments" className="text-orange-700 hover:underline">
                Manage assessments →
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
