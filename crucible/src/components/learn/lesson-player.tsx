"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonBody } from "@/components/learn/lesson-body";
import { markGuestProgress } from "@/components/learn/save-progress-cta";
import { XpBurst } from "@/components/learn/xp-burst";
import { LESSON_XP } from "@/server/learning/gamification";

export function LessonPlayer(props: {
  track: "interview" | "ai";
  pathLabel: string;
  pathHref: string;
  progressApi: string;
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  level: string;
  skills: string[];
  practiceSlug?: string | null;
  bodyMd: string;
  done: boolean;
  prevSlug: string | null;
  nextSlug: string | null;
  lessonHref: (slug: string) => string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(props.done);
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState<{ xp: number } | null>(null);

  async function mark(doneNext: boolean) {
    setBusy(true);
    try {
      const res = await fetch(props.progressApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonSlug: props.slug, done: doneNext }),
      });
      const json = await res.json();
      if (!json.ok) {
        // Guests can't persist — still celebrate and nudge account creation.
        if (res.status === 401 || res.status === 403) {
          markGuestProgress();
          setDone(doneNext);
          if (doneNext) {
            setCelebration({ xp: LESSON_XP });
            toast.message("Lesson finished as guest — sign in to save XP");
          }
          return;
        }
        throw new Error(json.error?.message || "Failed");
      }
      setDone(doneNext);
      const xp = Number(json.data?.xpEarned ?? 0);
      if (doneNext && xp > 0) {
        setCelebration({ xp });
        toast.success(`Lesson complete · +${xp} XP`);
      } else {
        toast.message(doneNext ? "Lesson marked complete" : "Marked incomplete");
        if (!doneNext) setCelebration(null);
      }
      if (doneNext) markGuestProgress();
      if (doneNext && props.nextSlug) {
        // brief beat so celebration is visible
        setTimeout(() => router.push(props.lessonHref(props.nextSlug!)), 700);
      } else {
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={props.pathHref} className="text-orange-700 hover:underline">
          ← {props.pathLabel}
        </Link>
        <span className="text-slate-500">/</span>
        <span className="capitalize text-slate-500">{props.level}</span>
      </div>

      <header>
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">{props.level}</Badge>
          <Badge>{props.minutes} min</Badge>
          <Badge variant="amber">+{LESSON_XP} XP</Badge>
          {done && <Badge variant="emerald">done</Badge>}
        </div>
        <h1 className="mt-3 font-serif-display text-2xl sm:text-3xl">{props.title}</h1>
        <p className="mt-2 text-slate-600">{props.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {props.skills.map((s) => (
            <Badge key={s} variant="brand">
              {s}
            </Badge>
          ))}
        </div>
      </header>

      {celebration && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-[var(--surface-elevated)] p-5">
          <XpBurst amount={celebration.xp} active />
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-800">Lesson complete</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-900">+{celebration.xp} XP</p>
            <p className="mt-2 text-sm text-slate-600">
              {props.nextSlug ? "Loading the next lesson…" : "That was the last lesson on this path."}
            </p>
          </div>
        </div>
      )}

      <article className="rounded-2xl border border-slate-200 bg-white/80 p-5 sm:p-6">
        <LessonBody md={props.bodyMd} />
      </article>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {!done ? (
          <Button disabled={busy} onClick={() => void mark(true)}>
            Mark complete (+{LESSON_XP} XP){props.nextSlug ? " & continue" : ""}
          </Button>
        ) : (
          <Button variant="secondary" disabled={busy} onClick={() => void mark(false)}>
            Mark incomplete
          </Button>
        )}
        {props.practiceSlug && (
          <Link href={`/challenges?q=${encodeURIComponent(props.practiceSlug)}`}>
            <Button variant="secondary">Practice in problem bank</Button>
          </Link>
        )}
        <Link href="/learn">
          <Button variant="ghost">Learn hub →</Button>
        </Link>
      </div>

      <nav className="flex justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
        {props.prevSlug ? (
          <Link href={props.lessonHref(props.prevSlug)} className="text-slate-600 hover:text-orange-800">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {props.nextSlug ? (
          <Link href={props.lessonHref(props.nextSlug)} className="text-orange-700 hover:underline">
            Next →
          </Link>
        ) : (
          <Link href={props.pathHref} className="text-orange-700 hover:underline">
            Back to path →
          </Link>
        )}
      </nav>
    </div>
  );
}
