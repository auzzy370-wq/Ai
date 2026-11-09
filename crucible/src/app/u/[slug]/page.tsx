import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { safeHref } from "@/lib/safe-url";
import { Badge } from "@/components/ui/badge";
import { formatScore } from "@/lib/utils";
import { trackBadgeVariant, trackLabel } from "@/lib/tracks";
import { buildLearnerGameState } from "@/server/learning/gamification";

export const dynamic = "force-dynamic";

export default async function PublicQualificationProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await prisma.candidateProfile.findUnique({
    where: { publicSlug: slug },
    include: {
      skills: true,
      user: {
        select: {
          id: true,
          name: true,
          githubLogin: true,
          assignments: {
            where: {
              OR: [
                { status: { in: ["COMPLETED", "UNDER_REVIEW"] } },
                { scoreReport: { isNot: null } },
              ],
            },
            include: {
              assessment: { select: { title: true, track: true } },
              scoreReport: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 12,
          },
        },
      },
    },
  });
  if (!profile || !profile.publicEnabled) notFound();

  const verified = profile.skills.filter((s) => s.source === "ASSESSMENT" || s.source === "HUMAN_REVIEW");
  const portfolio = profile.skills.filter((s) => s.source === "PORTFOLIO");
  const scored = profile.user.assignments.filter((a) => a.scoreReport);
  const best = scored.reduce((m, a) => Math.max(m, a.scoreReport?.overall ?? 0), 0);
  const game = await buildLearnerGameState(profile.user.id);

  const links = (
    [
      { raw: profile.portfolioUrl, label: "Portfolio" },
      { raw: profile.githubUrl, label: "GitHub" },
      { raw: profile.linkedInUrl, label: "LinkedIn" },
    ] as const
  )
    .map((l) => {
      const href = safeHref(l.raw);
      return href ? { href, label: l.label } : null;
    })
    .filter(Boolean) as { href: string; label: string }[];

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
        <span className="font-mono text-[10px] tracking-widest text-slate-500">PUBLIC QUALIFICATION</span>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-8 px-6 pb-20">
        {["casey-elite", "sam-appsec", "premium-prep"].includes(slug) && (
          <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <span className="font-semibold">Demo seed profile.</span> Progress and ELITE scores here are sample data from
            platform seed — not a live candidate applying to your company.
          </p>
        )}
        <section className="animate-rise overflow-hidden rounded-2xl border border-orange-300/60 bg-[var(--surface-elevated)] p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.3em] text-orange-700">VERIFIED PROFILE</p>
          <h1 className="mt-3 font-serif-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
            {profile.user.name}
          </h1>
          <p className="mt-2 text-lg text-slate-700">{profile.headline || "Crucible candidate"}</p>
          {profile.bio && <p className="mt-4 max-w-2xl text-slate-600">{profile.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="amber">Level {game.level}</Badge>
            <Badge variant="brand">{game.xp.toLocaleString()} XP</Badge>
            <Badge variant={trackBadgeVariant(profile.preferredTrack)}>{trackLabel(profile.preferredTrack)}</Badge>
            {profile.yearsExperience != null && <Badge>{profile.yearsExperience}+ years</Badge>}
            {verified.length > 0 && <Badge variant="emerald">{verified.length} verified skills</Badge>}
            {best > 0 && <Badge variant="amber">Best {formatScore(best)}</Badge>}
            {game.streak.longest > 0 && <Badge variant="emerald">Longest streak {game.streak.longest}d</Badge>}
          </div>
          {links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-sm text-orange-700 hover:underline"
                >
                  {l.label} →
                </a>
              ))}
            </div>
          )}
          {game.paths.interview.percent > 0 || game.paths.ai.percent > 0 || game.streak.longest > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {game.paths.interview.percent > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Interview craft</p>
                  <p className="mt-1 font-serif-display text-2xl text-slate-900">{game.paths.interview.percent}%</p>
                  <p className="text-xs text-slate-500">
                    {game.paths.interview.done}/{game.paths.interview.total} lessons
                  </p>
                </div>
              )}
              {game.paths.ai.percent > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">AI craft</p>
                  <p className="mt-1 font-serif-display text-2xl text-slate-900">{game.paths.ai.percent}%</p>
                  <p className="text-xs text-slate-500">
                    {game.paths.ai.done}/{game.paths.ai.total} lessons
                  </p>
                </div>
              )}
              {game.streak.longest > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Streak</p>
                  <p className="mt-1 font-serif-display text-2xl text-slate-900">{game.streak.current}d</p>
                  <p className="text-xs text-slate-500">Longest {game.streak.longest}d</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
              Qualification on this page comes from timed assessments and verified skills — craft lesson progress has not
              been published yet.
            </p>
          )}
        </section>

        {(profile.languages.length > 0 ||
          profile.frameworks.length > 0 ||
          profile.cybersecurity.length > 0) && (
          <section className="animate-rise space-y-3">
            <h2 className="font-serif-display text-xl text-slate-900">Stack (self-reported)</h2>
            <p className="text-xs text-slate-500">Not the same as verified skills — listed by the candidate.</p>
            <div className="flex flex-wrap gap-1.5">
              {[...profile.languages, ...profile.frameworks, ...profile.cybersecurity].map((x) => (
                <Badge key={x} variant="brand">
                  {x}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <section className="animate-rise space-y-3">
          <h2 className="font-serif-display text-xl text-slate-900">Assessment-verified skills</h2>
          <p className="text-xs text-slate-500">
            Claimed résumé skills are never shown here. Only assessment and human-review evidence appears as verified.
          </p>
          <div className="flex flex-wrap gap-2">
            {verified.length ? (
              verified.map((s) => (
                <Badge key={s.id} variant={s.source === "HUMAN_REVIEW" ? "violet" : "emerald"}>
                  {s.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">No verified skills published yet.</span>
            )}
          </div>
          {portfolio.length > 0 && (
            <div className="pt-2">
              <div className="mb-2 text-xs text-slate-500">Portfolio-backed</div>
              <div className="flex flex-wrap gap-2">
                {portfolio.map((s) => (
                  <Badge key={s.id}>{s.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="animate-rise space-y-3">
          <h2 className="font-serif-display text-xl text-slate-900">Assessments</h2>
          <div className="space-y-2">
            {profile.user.assignments.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.assessment.title}</span>
                  <Badge variant={trackBadgeVariant(a.assessment.track)}>{trackLabel(a.assessment.track)}</Badge>
                  {a.scoreReport && (
                    <>
                      <Badge variant="emerald">{formatScore(a.scoreReport.overall)}</Badge>
                      <Badge>{a.scoreReport.tier}</Badge>
                    </>
                  )}
                </div>
                {a.scoreReport && (
                  <Link href={`/scorecard/${a.id}`} className="text-sm text-orange-700 hover:underline">
                    Scorecard →
                  </Link>
                )}
              </div>
            ))}
            {!profile.user.assignments.length && (
              <p className="text-sm text-slate-500">No completed assessments on this public profile yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
