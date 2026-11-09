"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ResearchFrontierClient() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/competition/research-frontier");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      setChallenges(json.data.challenges ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-amber-300">D10 · RESEARCH FRONTIER</p>
        <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Research Frontier</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Exceptionally hard, objectively testable problems — approximation bounds, concurrency opacity,
          distributed load balance. No contradictory puzzles. Hidden fixtures stay server-side.
        </p>
      </header>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Refresh catalog
        </Button>
        <Link href="/leaderboards" className="inline-flex items-center text-sm text-orange-700 hover:underline">
          View rankings →
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading frontier…</p>
      ) : (
        <div className="space-y-3">
          {challenges.map((c) => (
            <article key={c.id} className="rounded-xl border border-amber-500/20 bg-white/75 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium text-slate-900">{c.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{c.summary}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="amber">D{c.difficulty}</Badge>
                  {c.expectedComplexity && <Badge>{c.expectedComplexity}</Badge>}
                  <Badge variant="brand">{c.timeLimitMs}ms</Badge>
                </div>
              </div>
              {c.functionSignature && (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-black/40 p-3 font-mono text-[11px] text-orange-900/90">
                  {c.functionSignature}
                </pre>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                {(c.tags ?? []).slice(0, 6).map((t: string) => (
                  <span key={t} className="rounded border border-slate-200 px-1.5 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  href={`/challenges?q=${encodeURIComponent(c.slug)}`}
                  className="text-sm text-orange-700 hover:underline"
                >
                  Open in challenge bank →
                </Link>
              </div>
            </article>
          ))}
          {!challenges.length && (
            <p className="rounded-xl border border-slate-200 px-4 py-10 text-center text-slate-500">
              No frontier challenges published yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
