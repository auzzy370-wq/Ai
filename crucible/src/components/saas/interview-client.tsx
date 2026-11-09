"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocalTime } from "@/components/ui/local-time";
import { cn } from "@/lib/utils";
import {
  INTERVIEW_COMPANIES,
  INTERVIEW_ROLES,
  INTERVIEW_ROUNDS,
  ROUND_BRIEFING,
  type InterviewRoundKind,
} from "@/server/saas/interview-rounds";

type Sim = {
  id: string;
  company: string;
  role: string;
  status: string;
  timedMinutes: number;
  roundKind?: string | null;
  createdAt: string;
  challenge: { title: string; slug: string; difficulty: number };
  workspaceId?: string | null;
};

export function InterviewClient(props: {
  premium: boolean;
  sims: Sim[];
  freeRemaining: number;
}) {
  const router = useRouter();
  const [company, setCompany] = useState<string>(INTERVIEW_COMPANIES[0] ?? "Google");
  const [role, setRole] = useState<string>(INTERVIEW_ROLES[0]);
  const [roundId, setRoundId] = useState<InterviewRoundKind>("coding");
  const [busy, setBusy] = useState(false);

  const round = useMemo(() => INTERVIEW_ROUNDS.find((r) => r.id === roundId) ?? INTERVIEW_ROUNDS[1]!, [roundId]);
  const briefing = ROUND_BRIEFING[round.id];

  const companiesTried = useMemo(() => new Set(props.sims.map((s) => s.company)).size, [props.sims]);
  const inProgress = props.sims.filter((s) => s.status === "IN_PROGRESS").length;
  const canStart = props.premium || props.freeRemaining > 0;

  async function start() {
    if (!canStart) {
      toast.error("Free mock used — upgrade for unlimited company rounds");
      router.push("/pricing");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company, role, roundKind: round.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Could not start");
      toast.success(`${company} ${round.title} ready · ${json.data.timedMinutes}m · +${round.xp} XP on clear`);
      if (json.data.workspaceId) {
        router.push(`/workspace/${json.data.workspaceId}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const actionButtons = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button className="w-full truncate sm:w-auto" disabled={busy || !canStart} onClick={() => void start()}>
        <span className="truncate">
          {busy ? (
            "Provisioning…"
          ) : (
            <>
              <span className="sm:hidden">Start {company} loop</span>
              <span className="hidden sm:inline">
                Start {company} · {round.title}
              </span>
            </>
          )}
        </span>
      </Button>
      <div className="flex gap-2">
        <Link href="/learn/interview" className="min-w-0 flex-1 sm:flex-none">
          <Button variant="secondary" className="w-full sm:w-auto">
            <span className="sm:hidden">Interview Craft</span>
            <span className="hidden sm:inline">Interview Craft lessons</span>
          </Button>
        </Link>
        {!props.premium && !canStart && (
          <Link href="/pricing" className="min-w-0 flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">
              Go Premium
            </Button>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
    {/* No transform here — fixed mobile CTA must escape containing blocks */}
    <div className="animate-rise min-w-0 space-y-8">
      <header className="min-w-0 rounded-2xl border border-orange-300/50 bg-[var(--surface-elevated)] p-4 sm:p-7">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-[0.3em] text-orange-700">MOCK INTERVIEWS</p>
            <h1 className="mt-2 font-serif-display text-2xl text-slate-900 sm:text-3xl">
              Company rounds. Real clock. Same judge.
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Pick a company and round length, get a briefing, then open a timed evidence workspace — public + hidden
              harnesses, just like the loop.
            </p>
          </div>
          {!props.premium && (
            <div className="min-w-0 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {props.freeRemaining > 0 ? (
                <>
                  <strong>{props.freeRemaining}</strong> free mock left · then Premium for unlimited
                </>
              ) : (
                <>
                  Free mock used.{" "}
                  <Link href="/pricing" className="font-medium text-orange-800 underline">
                    Unlock unlimited
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Mocks run", value: String(props.sims.length) },
            { label: "In progress", value: String(inProgress) },
            { label: "Companies tried", value: String(companiesTried) },
          ].map((s) => (
            <div key={s.label} className="min-w-0 rounded-xl border border-orange-200/70 bg-white/80 px-3 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
              <p className="mt-1 font-serif-display text-2xl text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>
      </header>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white/80 p-4 sm:p-6">
          <div className="min-w-0">
            <h2 className="font-serif-display text-xl text-slate-900">Build your round</h2>
            <p className="mt-1 text-sm text-slate-600">Company · role · format. Then open the workspace.</p>
          </div>

          <div className="min-w-0">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Round format</p>
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
              {INTERVIEW_ROUNDS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoundId(r.id)}
                  className={cn(
                    "box-border w-full min-w-0 max-w-full rounded-xl border px-3 py-3 text-left transition",
                    roundId === r.id
                      ? "border-orange-400 bg-orange-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-orange-300",
                  )}
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-900">{r.title}</span>
                    <Badge variant="amber" className="shrink-0">
                      {r.minutes}m
                    </Badge>
                  </div>
                  <p className="mt-1 break-words text-xs text-slate-600">{r.blurb}</p>
                  <p className="mt-2 font-mono text-[10px] text-orange-700">+{r.xp} XP on clear</p>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Company</p>
            <div className="flex w-full max-w-full flex-wrap gap-1.5">
              {INTERVIEW_COMPANIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCompany(c)}
                  className={cn(
                    "max-w-full rounded-md border px-3 py-2 text-xs transition",
                    company === c
                      ? "border-orange-400 bg-orange-50 text-orange-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <Input
              className="mt-2 max-w-full"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
            />
          </div>

          <div className="min-w-0">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Role</p>
            <div className="flex w-full max-w-full flex-wrap gap-1.5">
              {INTERVIEW_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "max-w-full shrink rounded-md border px-2.5 py-1.5 text-left text-xs transition",
                    role === r
                      ? "border-orange-400 bg-orange-50 text-orange-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input
              className="mt-2 max-w-full"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role"
            />
          </div>

          {/* Desktop keeps actions in the card; mobile uses the fixed dock below */}
          <div className="mt-2 hidden lg:block">{actionButtons}</div>
          <div className="h-28 lg:hidden" aria-hidden />
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-700">{briefing.title}</p>
            <h3 className="mt-2 font-serif-display text-lg text-slate-900">
              {company} · {round.title}
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-700">
              {briefing.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 font-mono text-[11px] text-slate-500">
              Clock: {round.minutes} minutes · Difficulty bias: {round.difficultyBias}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
            <h3 className="font-serif-display text-lg text-slate-900">Before you start</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Quiet room, one screen, timer visible.</li>
              <li>Talk through constraints before the first keystroke.</li>
              <li>Public tests first — hidden harness after green.</li>
              <li>
                Prep with a{" "}
                <Link href="/study-plans" className="text-orange-700 hover:underline">
                  study plan
                </Link>{" "}
                if the company has one.
              </li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-serif-display text-xl text-slate-900">Recent simulations</h2>
          <p className="font-mono text-[11px] text-slate-500">{props.sims.length} total</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {props.sims.map((s) => (
            <article key={s.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="brand">{s.company}</Badge>
                <Badge variant={s.status === "IN_PROGRESS" ? "amber" : s.status === "COMPLETED" ? "emerald" : "default"}>
                  {s.status.replaceAll("_", " ")}
                </Badge>
                <Badge variant="amber">{s.timedMinutes}m</Badge>
                {s.roundKind && <Badge>{s.roundKind}</Badge>}
              </div>
              <h3 className="mt-3 font-medium text-slate-900">{s.challenge.title}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {s.role} · <LocalTime value={s.createdAt} />
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {s.workspaceId && s.status === "IN_PROGRESS" && (
                  <Link href={`/workspace/${s.workspaceId}`}>
                    <Button size="sm">Resume workspace</Button>
                  </Link>
                )}
                <Link href={`/challenges?q=${encodeURIComponent(s.challenge.slug)}`}>
                  <Button size="sm" variant="secondary">
                    View problem
                  </Button>
                </Link>
              </div>
            </article>
          ))}
          {!props.sims.length && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-12 text-center text-sm text-slate-500 md:col-span-2">
              No simulations yet — start a company round above.
            </div>
          )}
        </div>
      </section>
    </div>
    <div className="mobile-sticky-cta border-t border-slate-200/80 px-3 py-2.5 lg:hidden">
      <div className="mx-auto w-full max-w-7xl">{actionButtons}</div>
    </div>
    </>
  );
}
