"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tab = "human" | "ai" | "team";

type MeStanding = {
  rank: number;
  userId?: string;
  teamId?: string;
  name: string;
  contestScore?: number;
  solvedCount?: number;
  completions?: number;
  contest?: string | null;
  overall?: number;
  memberCount?: number;
  assessmentTitle?: string;
  onDisplayedBoard?: boolean;
  metric?: "contest" | "completions";
  verified?: boolean;
  qualified?: boolean;
} | null;

export function LeaderboardsClient() {
  const [tab, setTab] = useState<Tab>("human");
  const [rows, setRows] = useState<any[]>([]);
  const [me, setMe] = useState<MeStanding>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(t: Tab) {
    setLoading(true);
    try {
      const res = await fetch(`/api/competition/leaderboards?tab=${t}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      setRows(json.data.rows ?? []);
      setMe(json.data.me ?? null);
      setNotes(json.data.scoringNotes ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(tab);
  }, [tab]);

  const highlightId =
    tab === "human" ? me?.userId : tab === "team" ? me?.teamId : undefined;

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">RANKINGS</p>
        <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Global leaderboards</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Separate boards for humans, AI models, and teams. Your personal standing stays visible to you even when
          you are outside the top board.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["human", "Human"],
            ["ai", "AI models"],
            ["team", "Teams"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              tab === id ? "border-orange-400/50 bg-orange-500/10 text-orange-900" : "border-slate-300 text-slate-600",
            )}
          >
            {label}
          </button>
        ))}
        <Button variant="secondary" size="sm" onClick={() => void load(tab)}>
          Refresh
        </Button>
      </div>

      <p className="font-mono text-[11px] text-slate-500">{notes}</p>

      {!loading && me && tab !== "ai" && (
        <section className="rounded-xl border border-[var(--brand)]/35 bg-[var(--brand-soft)] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--brand)]">
                Your standing · only visible to you
              </p>
              <p className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                {me.rank > 0 ? (
                  <>
                    #{me.rank}
                    <span className="ml-2 font-medium text-slate-700">{me.name}</span>
                  </>
                ) : (
                  <>Unranked · {me.name}</>
                )}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {tab === "human" && me.metric === "contest" && (
                  <>
                    Contest score {me.contestScore}
                    {me.contest ? ` · ${me.contest}` : ""} · {me.solvedCount} solved · {me.completions} clears
                  </>
                )}
                {tab === "human" && me.metric === "completions" && me.rank > 0 && (
                  <>
                    {me.completions} clears so far · join a contest to place on the contest board
                  </>
                )}
                {tab === "human" && me.rank === 0 && (
                  <>Clear a timed session or enter a contest to earn a place on this board.</>
                )}
                {tab === "team" && (
                  <>
                    Team score {me.overall}
                    {me.assessmentTitle ? ` · ${me.assessmentTitle}` : ""} · {me.memberCount} members
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {me.onDisplayedBoard ? (
                <Badge variant="emerald">On the board</Badge>
              ) : me.rank > 0 ? (
                <Badge variant="amber">Outside top {rows.length || 50}</Badge>
              ) : (
                <Badge>Not placed yet</Badge>
              )}
              {tab === "human" && me.metric === "completions" && me.rank > 0 && (
                <Badge variant="brand">By clears</Badge>
              )}
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <p className="text-slate-500">Loading standings…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-white/85 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">{tab === "ai" ? "Model" : tab === "team" ? "Team" : "Competitor"}</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isMe =
                  (tab === "human" && highlightId && r.userId === highlightId) ||
                  (tab === "team" && highlightId && r.teamId === highlightId);
                return (
                  <tr
                    key={r.rank + (r.userId || r.modelId || r.teamId)}
                    className={cn(
                      "border-b border-slate-200/80",
                      isMe && "bg-[var(--brand-soft)]",
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-slate-500">#{r.rank}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {r.name || r.displayName || "—"}
                        {isMe ? <span className="ml-2 text-xs font-medium text-[var(--brand)]">(you)</span> : null}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {r.provider || r.contest || r.assessmentTitle || r.publicSlug || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-orange-900">
                      {tab === "ai"
                        ? `${r.accuracyPct}%`
                        : tab === "team"
                          ? r.overall
                          : r.contestScore}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tab === "human" && (
                          <>
                            <Badge>{r.solvedCount} solved</Badge>
                            <Badge variant="brand">{r.completions} clears</Badge>
                          </>
                        )}
                        {tab === "ai" && (
                          <>
                            <Badge>
                              {r.correct}/{r.attempts} clears
                            </Badge>
                            {typeof r.clearRatePct === "number" && (
                              <Badge variant="brand">{r.clearRatePct}% full clears</Badge>
                            )}
                            {r.verifiedPool ? (
                              <Badge variant="emerald">verified</Badge>
                            ) : (
                              <Badge variant="amber">experimental</Badge>
                            )}
                          </>
                        )}
                        {tab === "team" && (
                          <>
                            <Badge>{r.memberCount} members</Badge>
                            {r.verified ? (
                              <Badge variant="emerald">scored</Badge>
                            ) : (
                              <Badge variant="amber">pending</Badge>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No standings yet — compete in tournaments or run AI benchmarks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
