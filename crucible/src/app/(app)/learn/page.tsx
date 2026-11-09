import Link from "next/link";
import { Suspense } from "react";
import { CANDIDATE_ROLES } from "@/lib/access";
import { prisma } from "@/lib/db";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { buildLearnerGameState, guestLearnerGameState, LESSON_XP } from "@/server/learning/gamification";
import { ARCADE_GAMES } from "@/server/learning/arcade-games";
import { ProgressHero } from "@/components/learn/progress-hero";
import { SaveProgressCta } from "@/components/learn/save-progress-cta";
import { JudgeBanner } from "@/components/layout/judge-banner";
import { WelcomeSignIn } from "@/components/auth/welcome-sign-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LearnHubPage() {
  const user = await requirePageRolesOrGuest("/learn", CANDIDATE_ROLES);
  const [game, assigned] = user
    ? await Promise.all([
        buildLearnerGameState(user.id),
        prisma.assessmentAssignment.findMany({
          where: { candidateId: user.id, status: { notIn: ["COMPLETED", "FAILED", "EXPIRED"] } },
          select: {
            id: true,
            status: true,
            assessment: { select: { title: true } },
            workspace: { select: { id: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 4,
        }),
      ])
    : [guestLearnerGameState(), []];

  return (
    <div className="animate-rise space-y-8">
      {!user && (
        <Suspense fallback={null}>
          <WelcomeSignIn />
        </Suspense>
      )}
      <header className="space-y-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-[var(--brand)]">LEARN{!user ? " · FREE" : ""}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Get interview-ready</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            {user
              ? "Short lessons, then real problems judged on hidden tests. You earn XP for work you finish."
              : "Everything here is free to try. Sign in when you want your XP and streak saved."}
          </p>
        </div>
        <ProgressHero game={game} />
        <SaveProgressCta guest={!user} />
        <JudgeBanner />
      </header>

      {assigned.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">Assigned to you</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {assigned.map((a) => (
              <Link
                key={a.id}
                href={a.workspace ? `/workspace/${a.workspace.id}` : "/challenges"}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--brand)]/40 bg-white/80 px-4 py-4 transition hover:border-[var(--brand)]"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-slate-900">{a.assessment.title}</h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">{a.status.replaceAll("_", " ").toLowerCase()}</p>
                </div>
                <span className="shrink-0 text-sm text-[var(--brand)]">Open →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">Today</h2>
            <p className="mt-1 text-sm text-slate-500">
              {game.todayDone}/{game.today.length} done
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {game.today.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={cn(
                "group rounded-xl border px-4 py-4 transition",
                t.done
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-slate-200 bg-white/80 hover:border-[var(--brand)]/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-slate-900 group-hover:text-[var(--brand)]">{t.title}</h3>
                {t.done ? (
                  <Badge variant="emerald">Done</Badge>
                ) : t.xp > 0 ? (
                  <Badge variant="brand">+{t.xp} XP</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-500">{t.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">Paths</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <PathCard
            label="Interview Craft"
            blurb="How coding interviews actually run, and the patterns that come up most."
            path={game.paths.interview}
            browseHref="/learn/interview"
          />
          <PathCard
            label="AI Craft"
            blurb="Building with LLMs: prompting, evals, retrieval and shipping to production."
            path={game.paths.ai}
            browseHref="/learn/ai"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">Practice</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <PracticeCard
            title="Problem bank"
            body="Hand-authored coding and mission problems. Hidden suites need a Docker judge."
            href="/challenges"
            cta="Browse problems"
          />
          {user ? (
            <PracticeCard
              title="Mock interviews"
              body="Timed rounds modeled on company loops (signed-in)."
              href="/interview"
              cta="Start a mock"
            />
          ) : (
            <PracticeCard
              title="Mock interviews"
              body="Timed company rounds unlock after you create a free account."
              href="/register?next=/interview"
              cta="Sign in to unlock"
            />
          )}
          <PracticeCard
            title="Arcade"
            body={`${ARCADE_GAMES.length} two-minute games for hashing, Big-O and binary search.`}
            href="/learn/games"
            cta="Play"
          />
        </div>
      </section>
    </div>
  );
}

function PathCard(props: {
  label: string;
  blurb: string;
  browseHref: string;
  path: {
    percent: number;
    done: number;
    total: number;
    nextTitle: string | null;
    nextHref: string;
  };
}) {
  const { path } = props;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{props.label}</h3>
        <span className="font-mono text-xs text-slate-500">
          {path.done}/{path.total} lessons · +{LESSON_XP} XP each
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">{props.blurb}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-700"
          style={{ width: `${path.percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {path.nextTitle ? (
          <>
            Next: <span className="font-medium">{path.nextTitle}</span>
          </>
        ) : (
          "Path complete."
        )}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={path.nextHref}>
          <Button>{path.nextTitle ? "Continue" : "Review"}</Button>
        </Link>
        <Link href={props.browseHref}>
          <Button variant="secondary">All lessons</Button>
        </Link>
      </div>
    </div>
  );
}

function PracticeCard(props: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-5">
      <h3 className="font-semibold text-slate-900">{props.title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-600">{props.body}</p>
      <div className="mt-4">
        <Link href={props.href}>
          <Button variant="secondary">{props.cta}</Button>
        </Link>
      </div>
    </div>
  );
}
