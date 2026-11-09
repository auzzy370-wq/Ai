"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { difficultyBand } from "@/lib/difficulty";

type Roadmap = {
  mastery: { easy: number; medium: number; hard: number; level: string };
  weakTags: { tag: string; fails: number; wins: number }[];
  recurringGaps: string[];
  targetDifficulty: number;
  nextProblems: { id: string; slug: string; title: string; difficulty: number; tags: string[] }[];
  skillTree: {
    id: string;
    label: string;
    prereq: string[];
    mastery: number;
    total?: number;
    href?: string;
  }[];
};

export function RoadmapClient() {
  const [data, setData] = useState<Roadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/learn/roadmap");
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message || "Failed to load roadmap");
        setData(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    })();
  }, []);

  if (error) {
    return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-sm text-rose-100">{error}</p>;
  }
  if (!data) {
    return <p className="text-slate-500">Building your adaptive roadmap…</p>;
  }

  return (
    <div className="animate-rise space-y-8">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">ADAPTIVE PATH</p>
        <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Personal roadmap</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Crucible tracks what you clear, where you stall, and which skills transfer — then raises difficulty as you
          improve.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ["Level", data.mastery.level],
          ["Easy clears", String(data.mastery.easy)],
          ["Medium clears", String(data.mastery.medium)],
          ["Hard clears", String(data.mastery.hard)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 bg-white/75 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
            <div className="mt-1 font-mono text-lg text-orange-900">{v}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white/75 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Skill tree</h2>
          <p className="mt-1 text-xs text-slate-500">Prerequisites unlock as mastery grows from verified clears.</p>
          <ul className="mt-4 space-y-3">
            {data.skillTree.map((n) => (
              <li key={n.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  {n.href ? (
                    <Link href={n.href} className="text-slate-800 hover:text-orange-800">
                      {n.label}
                    </Link>
                  ) : (
                    <span className="text-slate-800">{n.label}</span>
                  )}
                  <Badge variant="brand">
                    {n.total != null ? `${n.mastery}/${n.total}` : `×${n.mastery}`}
                  </Badge>
                </div>
                {n.prereq.length > 0 && (
                  <div className="mt-1 font-mono text-[10px] text-slate-500">needs: {n.prereq.join(" → ")}</div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/75 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Focus signals</h2>
          <p className="mt-1 text-xs text-slate-500">
            Target difficulty band ~{data.targetDifficulty}/10 based on recent performance.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Weak tags</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {!data.weakTags.length && <span className="text-sm text-slate-500">No weak tags yet — keep solving.</span>}
                {data.weakTags.map((t) => (
                  <span key={t.tag} className="rounded border border-amber-500/30 px-2 py-1 font-mono text-xs text-amber-900 dark:text-amber-100">
                    {t.tag} · {t.fails}F/{t.wins}W
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Recurring gaps</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {!data.recurringGaps.length && <li className="text-slate-500">Pinpoint gaps appear after judged submits.</li>}
                {data.recurringGaps.map((g) => (
                  <li key={g}>· {g}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/75 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Recommended next</h2>
        <p className="mt-1 text-xs text-slate-500">Problems matched to your weak tags and rising difficulty.</p>
        <ul className="mt-4 divide-y divide-slate-800">
          {!data.nextProblems.length && (
            <li className="py-4 text-sm text-slate-500">
              No fresh matches — explore the{" "}
              <Link href="/challenges" className="text-orange-400 hover:underline">
                practice bank
              </Link>
              .
            </li>
          )}
          {data.nextProblems.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="text-slate-900">{p.title}</div>
                <div className="font-mono text-[11px] text-slate-500">
                  {difficultyBand(p.difficulty)} · {p.tags.filter((t) => t !== "coding").slice(0, 4).join(", ")}
                </div>
              </div>
              <Link
                href={`/challenges?q=${encodeURIComponent(p.slug)}`}
                className="text-sm text-orange-700 hover:underline"
              >
                Open →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
