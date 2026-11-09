"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ContestClient() {
  const [contest, setContest] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/contests");
    const json = await res.json();
    if (json.ok) setContest(json.data.contest);
  }

  useEffect(() => {
    void load();
  }, []);

  async function checkIn(points: number) {
    if (!contest) return;
    const res = await fetch("/api/contests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contestId: contest.id, deltaScore: points, penaltyMin: 0 }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Failed");
    toast.success(`+${points} on the board`);
    await load();
  }

  if (!contest) {
    return <p className="text-slate-500">No active contest heat right now.</p>;
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">PROVE THE CRAFT</p>
        <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">{contest.title}</h1>
        <p className="mt-2 max-w-3xl text-slate-600">{contest.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="brand">Ends {new Date(contest.endsAt).toLocaleString()}</Badge>
          <Badge>{contest.problems?.length ?? 0} problems</Badge>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">Heat set</h2>
        {contest.problems?.map((p: any) => (
          <div key={p.id} className="rounded-xl border border-slate-200 px-4 py-3">
            <div className="font-medium">
              {p.ordinal}. {p.challenge.title}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">{p.points} pts</div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/challenges"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-3 text-sm text-orange-700 sm:min-h-0 sm:justify-start sm:border-0 sm:px-0"
              >
                Open evidence bank →
              </Link>
              <Button className="w-full sm:w-auto" size="sm" variant="secondary" onClick={() => checkIn(p.points)}>
                Mark solved
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">Leaderboard</h2>
        <div className="space-y-2 sm:hidden">
          {(contest.entries ?? []).map((e: any, i: number) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-slate-600">#{i + 1}</div>
                <div className="truncate text-sm font-medium text-slate-900">{e.user?.name}</div>
              </div>
              <div className="shrink-0 text-right font-mono text-sm">
                <div className="text-orange-800">{e.score}</div>
                <div className="text-[11px] text-slate-500">{e.solvedCount} solved</div>
              </div>
            </div>
          ))}
          {!(contest.entries ?? []).length && (
            <p className="rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-500">
              Be the first on the board.
            </p>
          )}
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Engineer</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Solved</th>
              </tr>
            </thead>
            <tbody>
              {(contest.entries ?? []).map((e: any, i: number) => (
                <tr key={e.id} className="border-b border-slate-200/80">
                  <td className="px-4 py-3 font-mono text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3">{e.user?.name}</td>
                  <td className="px-4 py-3 font-mono text-orange-800">{e.score}</td>
                  <td className="px-4 py-3 font-mono">{e.solvedCount}</td>
                </tr>
              ))}
              {!(contest.entries ?? []).length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Be the first on the board.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Contests are an optional habit loop — evidence-based assessments still outrank puzzle velocity.
        </p>
      </section>
    </div>
  );
}
