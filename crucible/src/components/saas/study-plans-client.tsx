"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlanItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  avgMinutes: number | null;
  done: boolean;
  href?: string;
  xp?: number;
};

type Plan = {
  slug: string;
  title: string;
  subtitle: string;
  company?: string;
  role: string;
  days: number;
  premium: boolean;
  enrolled: boolean;
  completedCount: number;
  totalCount: number;
  percent: number;
  items: PlanItem[];
  itemKind?: "lesson" | "challenge";
  track?: string;
  earnedXp: number;
  totalXp: number;
  remainingXp: number;
  nextItemSlug: string | null;
  complete: boolean;
};

type Summary = {
  enrolledCount: number;
  completedPlans: number;
  activeSlug: string | null;
  totalEarnedXp: number;
  next: { title: string; detail: string };
};

function diffLabel(d: number) {
  if (d <= 3) return "Easy";
  if (d <= 6) return "Medium";
  return "Hard";
}

export function StudyPlansClient(props: { plans: Plan[]; summary: Summary; premium: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "company" | "free">("all");
  const defaultOpen = props.summary.activeSlug ?? props.plans.find((p) => p.enrolled)?.slug ?? props.plans[0]?.slug ?? null;
  const [open, setOpen] = useState<string | null>(defaultOpen);

  const active = useMemo(
    () => props.plans.find((p) => p.slug === props.summary.activeSlug) ?? null,
    [props.plans, props.summary.activeSlug],
  );

  const filtered = useMemo(() => {
    return props.plans.filter((p) => {
      if (filter === "active") return p.enrolled && !p.complete;
      if (filter === "company") return Boolean(p.company);
      if (filter === "free") return !p.premium;
      return true;
    });
  }, [props.plans, filter]);

  const nextActiveItem = active?.items.find((i) => i.slug === active.nextItemSlug);

  async function enroll(planSlug: string, requiresPremium: boolean) {
    if (requiresPremium && !props.premium) {
      toast.error("Premium study plan");
      router.push("/pricing");
      return;
    }
    setBusy(planSlug);
    try {
      const res = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Enroll failed");
      toast.success("Plan started — open the first problem");
      setOpen(planSlug);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enroll failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggle(planSlug: string, challengeSlug: string, done: boolean) {
    setBusy(`${planSlug}:${challengeSlug}`);
    try {
      const res = await fetch(`/api/study-plans/${planSlug}/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeSlug, done: !done }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Update failed");
      const xp = Number(json.data?.xpEarned ?? 0);
      if (!done && xp > 0) {
        toast.success(`Marked done · +${xp} XP`);
      } else {
        toast.message(done ? "Marked incomplete" : "Updated");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-rise space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-orange-700">STUDY PLANS</p>
            <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Curated problem lists</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Problem sets grouped by company or role, ordered from warm-up to hard. Every problem you solve earns XP.
            </p>
          </div>
          {!props.premium && (
            <Link href="/pricing">
              <Button variant="secondary">Unlock Premium plans</Button>
            </Link>
          )}
        </div>

        <section className="overflow-hidden rounded-2xl border border-orange-300/60 bg-[var(--surface-elevated)] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-orange-700/80">Study plan XP</p>
              <p className="mt-1 font-serif-display text-3xl text-slate-900 sm:text-4xl">
                {props.summary.totalEarnedXp.toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-sm text-slate-600">
                {props.summary.enrolledCount} started · {props.summary.completedPlans} finished
              </p>
            </div>
            {active && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="amber">{active.title}</Badge>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200/80 bg-white/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Up next</p>
                <h2 className="mt-1 text-lg font-medium text-slate-900">{props.summary.next.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{props.summary.next.detail}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {nextActiveItem ? (
                <Link href={nextActiveItem.href ?? "/challenges"}>
                  <Button>Continue: {nextActiveItem.title}</Button>
                </Link>
              ) : active ? (
                <Button
                  onClick={() => {
                    setOpen(active.slug);
                    document.getElementById(`plan-${active.slug}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Open {active.title}
                </Button>
              ) : (
                <Button
                  onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Browse plans
                </Button>
              )}
              {active && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOpen(active.slug);
                    document.getElementById(`plan-${active.slug}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Show problems
                </Button>
              )}
            </div>
            {active && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <span>{active.completedCount}/{active.totalCount} problems</span>
                  <span>
                    {active.earnedXp}/{active.totalXp} XP
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-[width] duration-700"
                    style={{ width: `${active.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </header>

      <section id="catalog" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-xl text-slate-900">All plans</h2>
            <p className="mt-1 text-sm text-slate-500">Start a plan to track progress through it.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["active", "In progress"],
                ["company", "Companies"],
                ["free", "Free"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition",
                  filter === id
                    ? "border-orange-400/50 bg-orange-500/10 text-orange-900"
                    : "border-slate-200 text-slate-600 hover:text-slate-800",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((plan) => {
            const isOpen = open === plan.slug;
            const next = plan.items.find((i) => i.slug === plan.nextItemSlug);
            return (
              <article
                key={plan.slug}
                id={`plan-${plan.slug}`}
                className={cn(
                  "rounded-2xl border p-5 transition",
                  plan.complete
                    ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                    : plan.premium
                      ? "border-amber-500/25 bg-white/80"
                      : "border-slate-200 bg-white/75",
                )}
              >
                <div className="flex flex-wrap gap-2">
                  {plan.track === "ai" && <Badge variant="brand">AI</Badge>}
                  {plan.track === "interview" && plan.itemKind === "lesson" && (
                    <Badge variant="brand">Interview</Badge>
                  )}
                  {plan.track === "security" && <Badge variant="rose">Security</Badge>}
                  {plan.company && <Badge variant="brand">{plan.company}</Badge>}
                  <Badge>{plan.role}</Badge>
                  <Badge variant="amber">{plan.days}d</Badge>
                  {plan.premium && <Badge variant="amber">Premium</Badge>}
                  {plan.complete && <Badge variant="emerald">Finished</Badge>}
                </div>
                <h3 className="mt-3 font-serif-display text-xl text-slate-900">{plan.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{plan.subtitle}</p>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-500">
                    <span>
                      {plan.completedCount}/{plan.totalCount} done
                    </span>
                    <span>
                      {plan.earnedXp}/{plan.totalXp} XP
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700",
                        plan.complete ? "bg-emerald-400" : "bg-orange-500",
                      )}
                      style={{ width: `${plan.percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {!plan.enrolled ? (
                    <Button disabled={busy === plan.slug} onClick={() => void enroll(plan.slug, plan.premium)}>
                      {busy === plan.slug ? "Starting…" : "Start plan"}
                    </Button>
                  ) : (
                    <>
                      {next?.href && (
                        <Link href={next.href}>
                          <Button>Next problem</Button>
                        </Link>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => setOpen(isOpen ? null : plan.slug)}
                      >
                        {isOpen ? "Hide problems" : "Show problems"}
                      </Button>
                      {plan.slug === "ai-craft" && (
                        <Link href="/learn/ai">
                          <Button variant="ghost">AI Craft path →</Button>
                        </Link>
                      )}
                      {plan.slug === "interview-craft" && (
                        <Link href="/learn/interview">
                          <Button variant="ghost">Interview path →</Button>
                        </Link>
                      )}
                    </>
                  )}
                </div>

                {plan.enrolled && isOpen && (
                  <ul className="mt-4 space-y-2">
                    {plan.items.map((item, idx) => {
                      return (
                        <li key={item.slug}>
                          <div
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                              item.done
                                ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                                : item.slug === plan.nextItemSlug
                                  ? "border-orange-400/50 bg-orange-500/[0.05]"
                                  : "border-slate-200",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">
                                {idx + 1}. {item.title}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500">
                                {plan.itemKind === "lesson" ? "Lesson" : diffLabel(item.difficulty)} ·{" "}
                                {item.avgMinutes ?? 30}m · +{item.xp ?? 40} XP
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                className={cn(
                                  "rounded-md border px-2 py-1 text-xs",
                                  item.done
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800"
                                    : "border-slate-300 text-slate-600",
                                )}
                                disabled={busy === `${plan.slug}:${item.slug}`}
                                onClick={() => void toggle(plan.slug, item.slug, item.done)}
                              >
                                {item.done ? "Done" : "Mark done"}
                              </button>
                              <Link href={item.href ?? "/challenges"} className="text-xs text-orange-700 hover:underline">
                                Open
                              </Link>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
        {!filtered.length && (
          <p className="py-10 text-center text-sm text-slate-500">No plans match this filter.</p>
        )}
      </section>
    </div>
  );
}
