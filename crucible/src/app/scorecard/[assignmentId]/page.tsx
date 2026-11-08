import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatScore } from "@/lib/utils";
import { ShareScorecardButton } from "@/components/saas/share-scorecard";
import { getSessionUser, canReview, canManageCandidates } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** Employer scorecard — same auth as /api/scorecards (candidate, reviewer, or hiring). */
export default async function ScorecardPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/scorecard/${(await params).assignmentId}`);

  const { assignmentId } = await params;
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      candidate: { include: { candidateProfile: { include: { skills: true } } } },
      assessment: { include: { challenge: true } },
      scoreReport: true,
      reviews: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
  if (!assignment?.scoreReport) notFound();

  const allowed =
    assignment.candidateId === user.id || canReview(user.role) || canManageCandidates(user.role);
  if (!allowed) notFound();

  const profile = assignment.candidate.candidateProfile;
  const report = assignment.scoreReport;
  const verified =
    profile?.skills.filter((s) => s.source === "ASSESSMENT" || s.source === "HUMAN_REVIEW") ?? [];
  const diagnostics = report.diagnostics as {
    summary?: string;
    knows?: { name: string; domain: string; evidence: string[] }[];
    gaps?: { name: string; status: string; evidence: string[] }[];
    nextFocus?: string[];
    ceiling?: { note: string };
    band?: string;
    difficulty?: number;
  } | null;

  const categories: [string, number][] = [
    ["Frontend", report.frontend],
    ["Backend", report.backend],
    ["Database", report.database],
    ["Architecture", report.architecture],
    ["Infrastructure", report.infrastructure],
    ["Security", report.security],
    ["Testing", report.testing],
    ["Problem-solving", report.problemSolving],
    ["Performance", report.performance],
    ["Collaboration", report.collaboration],
  ];

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-40" />
      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-400/50 bg-orange-500/10 font-mono text-xs font-bold text-orange-700">
            CR
          </div>
          <span className="text-sm font-semibold tracking-[0.2em]">CRUCIBLE</span>
        </Link>
        <ShareScorecardButton assignmentId={assignmentId} />
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-8 px-6 pb-20">
        <div className="animate-rise">
          <p className="font-mono text-xs tracking-[0.3em] text-orange-700">EMPLOYER SCORECARD</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {assignment.candidate.name}
          </h1>
          <p className="mt-2 text-lg text-slate-700">{assignment.assessment.title}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant={assignment.assessment.track === "CYBERSECURITY" ? "violet" : "brand"}>
              {assignment.assessment.track}
            </Badge>
            <Badge variant="emerald">{formatScore(report.overall)}</Badge>
            <Badge>{report.tier}</Badge>
            <Badge variant={report.qualified ? "emerald" : "amber"}>
              {report.qualified ? "Qualified" : "Not yet qualified"}
            </Badge>
          </div>
          {profile?.publicSlug && profile.publicEnabled && (
            <Link href={`/u/${profile.publicSlug}`} className="mt-4 inline-block text-sm text-orange-700 hover:underline">
              Public qualification profile →
            </Link>
          )}
        </div>

        <section className="animate-rise grid gap-2 sm:grid-cols-2">
          {categories.map(([label, score]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3"
            >
              <span className="text-sm text-slate-600">{label}</span>
              <span className="font-mono text-slate-900">{formatScore(score)}</span>
            </div>
          ))}
        </section>

        {diagnostics && (
          <section className="animate-rise space-y-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
            <p className="font-mono text-xs tracking-[0.25em] text-orange-700">KNOWLEDGE PINPOINT</p>
            <p className="text-slate-800">{diagnostics.summary}</p>
            {diagnostics.band != null && (
              <p className="font-mono text-xs text-slate-500">
                {diagnostics.band} · D{diagnostics.difficulty ?? "—"}/10
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-400/80">Proven knows</div>
                <ul className="mt-2 space-y-1 text-sm text-emerald-100/90">
                  {(diagnostics.knows ?? []).slice(0, 10).map((k) => (
                    <li key={k.name}>
                      {k.name} <span className="text-slate-500">· {k.domain}</span>
                    </li>
                  ))}
                  {!diagnostics.knows?.length && <li className="text-slate-500">None proven on this run</li>}
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-amber-300/80">Gaps</div>
                <ul className="mt-2 space-y-1 text-sm text-amber-50/90">
                  {(diagnostics.gaps ?? []).slice(0, 10).map((g) => (
                    <li key={g.name}>
                      {g.name} <span className="text-slate-500">· {g.status}</span>
                    </li>
                  ))}
                  {!diagnostics.gaps?.length && <li className="text-slate-500">No open gaps on this run</li>}
                </ul>
              </div>
            </div>
            {diagnostics.ceiling?.note && <p className="text-xs text-slate-500">{diagnostics.ceiling.note}</p>}
          </section>
        )}

        <section className="animate-rise space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Verified skills on this scorecard</h2>
          <div className="flex flex-wrap gap-2">
            {verified.length ? (
              verified.map((s) => (
                <Badge key={s.id} variant={s.source === "HUMAN_REVIEW" ? "violet" : "emerald"}>
                  {s.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">No verified skills attached yet.</span>
            )}
          </div>
        </section>

        {assignment.reviews.length > 0 && (
          <section className="animate-rise space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Human review</h2>
            <ul className="space-y-2">
              {assignment.reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <Badge className="mb-2">{r.decision}</Badge>
                  <p>{r.reasoning}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-slate-500">
          Claimed résumé skills are excluded. Print this page or share with hiring staff who have access. Also available as{" "}
          <a className="text-orange-700 hover:underline" href={`/api/scorecards/${assignmentId}?format=ats`}>
            ATS text
          </a>
          .
        </p>
      </main>
    </div>
  );
}
