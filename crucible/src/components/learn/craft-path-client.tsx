"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LESSON_XP } from "@/server/learning/gamification";

type LessonRow = {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  level: string;
  skills: string[];
  practiceSlug: string | null;
  done: boolean;
};

type LevelDef = { id: string; label: string };

export function CraftPathClient(props: {
  track: "interview" | "ai";
  eyebrow: string;
  title: string;
  blurb: string;
  progressApi: string;
  lessonHref: (slug: string) => string;
  levels: LevelDef[];
  secondaryCtas?: { href: string; label: string; variant?: "secondary" | "ghost" }[];
}) {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [next, setNext] = useState<{ slug: string; title: string; summary: string; minutes: number } | null>(null);
  const [percent, setPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(props.progressApi);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      setLessons(json.data.lessons ?? []);
      setNext(json.data.nextLesson);
      setPercent(json.data.percent ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [props.progressApi]);

  async function enrollAndGo() {
    setBusy(true);
    try {
      await fetch(props.progressApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enroll: true }),
      });
      const target = next?.slug ?? lessons[0]?.slug;
      if (target) window.location.href = props.lessonHref(target);
      else await load();
    } finally {
      setBusy(false);
    }
  }

  const chapters = useMemo(() => {
    return props.levels.map((level) => {
      const rows = lessons.filter((l) => l.level === level.id);
      const done = rows.filter((l) => l.done).length;
      return {
        ...level,
        rows,
        done,
        total: rows.length,
        cleared: rows.length > 0 && done >= rows.length,
        percent: rows.length ? Math.round((done / rows.length) * 100) : 0,
      };
    });
  }, [lessons, props.levels]);

  const accent =
    props.track === "interview"
      ? "border-orange-300/50 bg-orange-500/[0.07]"
      : "border-emerald-300/50 bg-emerald-500/[0.07]";

  return (
    <div className="animate-rise space-y-8">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">{props.eyebrow}</p>
        <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">{props.title}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{props.blurb}</p>
      </header>

      <section className={cn("rounded-2xl border p-5", accent)}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-orange-700/80">Path progress</div>
            <div className="mt-1 font-mono text-2xl text-orange-900">{percent}% complete</div>
            {next ? (
              <p className="mt-1 text-sm text-slate-600">
                Next: <span className="text-slate-800">{next.title}</span> · {next.minutes} min · +{LESSON_XP} XP
              </p>
            ) : (
              <p className="mt-1 text-sm text-emerald-800">Path complete — try a study plan or a timed mock.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {next ? (
              <Link href={props.lessonHref(next.slug)}>
                <Button disabled={busy}>Continue lesson</Button>
              </Link>
            ) : (
              <Button disabled={busy} onClick={() => void enrollAndGo()}>
                {busy ? "…" : "Start path"}
              </Button>
            )}
            {(props.secondaryCtas ?? []).map((c) => (
              <Link key={c.href} href={c.href}>
                <Button variant={c.variant ?? "secondary"}>{c.label}</Button>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {chapters.map((ch) => (
            <span
              key={ch.id}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
                ch.cleared
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white/80 text-slate-600",
              )}
            >
              {ch.label} {ch.done}/{ch.total}
            </span>
          ))}
        </div>
      </section>

      {loading ? (
        <p className="text-slate-500">Loading curriculum…</p>
      ) : (
        chapters.map((ch) => {
          if (!ch.rows.length) return null;
          return (
            <section key={ch.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif-display text-lg text-slate-900">{ch.label}</h2>
                <Badge variant={ch.cleared ? "emerald" : "brand"}>
                  {ch.cleared ? "Done" : `${ch.percent}% · +${LESSON_XP} XP / lesson`}
                </Badge>
              </div>
              <ol className="relative space-y-2 border-l border-orange-200 pl-4">
                {ch.rows.map((l, idx) => {
                  const locked = Boolean(next) && !l.done && next?.slug !== l.slug && idx > 0 && !ch.rows[idx - 1]?.done;
                  return (
                    <li key={l.slug} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[1.4rem] top-4 h-2.5 w-2.5 rounded-full border-2",
                          l.done
                            ? "border-emerald-500 bg-emerald-400"
                            : next?.slug === l.slug
                              ? "border-orange-500 bg-orange-400"
                              : "border-slate-300 bg-white",
                        )}
                      />
                      <Link
                        href={props.lessonHref(l.slug)}
                        className={cn(
                          "flex flex-col gap-2 rounded-xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between",
                          l.done
                            ? "border-emerald-200 bg-emerald-50/50"
                            : next?.slug === l.slug
                              ? "border-orange-400 bg-orange-50/80 shadow-sm"
                              : "border-slate-200 bg-white/80 hover:border-orange-300",
                          locked && "opacity-70",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-500">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className="font-medium text-slate-900">{l.title}</span>
                            {l.done && <Badge variant="emerald">cleared</Badge>}
                            {next?.slug === l.slug && <Badge variant="amber">next</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{l.summary}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <Badge>{l.minutes} min</Badge>
                          <Badge variant="brand">+{LESSON_XP} XP</Badge>
                          {l.skills.slice(0, 2).map((s) => (
                            <Badge key={s} variant="brand">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })
      )}
    </div>
  );
}
