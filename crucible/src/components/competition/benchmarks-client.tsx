"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function BenchmarksClient() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [aiRes, humanRes] = await Promise.all([
        fetch("/api/competition/leaderboards?tab=ai"),
        fetch("/api/competition/leaderboards?tab=human"),
      ]);
      const ai = await aiRes.json();
      const human = await humanRes.json();
      if (!ai.ok) throw new Error(ai.error?.message || "Failed");
      setRows([
        {
          kind: "AI models",
          note: ai.data.scoringNotes,
          entries: (ai.data.rows ?? []).slice(0, 15),
        },
        {
          kind: "Humans (contest)",
          note: human.ok ? human.data.scoringNotes : "",
          entries: human.ok ? (human.data.rows ?? []).slice(0, 15) : [],
        },
      ]);
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
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">BENCHMARK REPORTS</p>
        <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Benchmark reports</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Side-by-side human and model standings from recorded runs. Experimental (mocked) AI results are labeled
          and never used to claim model incapability.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 text-sm">
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
        <Link href="/challenges" className="text-orange-700 hover:underline">
          Practice problems →
        </Link>
        <Link href="/leaderboards" className="text-orange-700 hover:underline">
          Full leaderboards →
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading reports…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {rows.map((block) => (
            <section key={block.kind} className="rounded-xl border border-slate-200 p-4">
              <h2 className="font-medium text-slate-900">{block.kind}</h2>
              <p className="mt-1 font-mono text-[11px] text-slate-500">{block.note}</p>
              <ul className="mt-3 space-y-2">
                {block.entries.map((r: any) => (
                  <li key={r.rank} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      <span className="font-mono text-slate-500">#{r.rank}</span>{" "}
                      {r.displayName || r.name}
                      {r.verifiedPool === false && (
                        <Badge variant="amber" className="ml-2">
                          experimental
                        </Badge>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-orange-800">
                      {r.accuracyPct != null ? `${r.accuracyPct}%` : r.contestScore}
                    </span>
                  </li>
                ))}
                {!block.entries.length && (
                  <li className="py-6 text-center text-slate-500">No data yet</li>
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
