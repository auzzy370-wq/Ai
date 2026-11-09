"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function TournamentsClient() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/competition/tournaments");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed");
      setTournaments(json.data.tournaments ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function register(contestId: string) {
    const res = await fetch("/api/competition/tournaments", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contestId }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message || "Registration failed");
    toast.success("Registered");
    await load();
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">TOURNAMENT CENTER</p>
        <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Tournaments</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Scheduled and live heats across human, AI, hybrid, and team modes. Standings update from verified
          submissions — not fabricated scores.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
        <Link href="/contest" className="inline-flex items-center text-sm text-orange-700 hover:underline">
          Weekly heat →
        </Link>
        <Link href="/leaderboards" className="inline-flex items-center text-sm text-orange-700 hover:underline">
          Leaderboards →
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading tournaments…</p>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <article key={t.id} className="rounded-xl border border-slate-200 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium text-slate-900">{t.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={t.status === "LIVE" ? "emerald" : t.status === "SCHEDULED" ? "brand" : "default"}>
                    {t.status}
                  </Badge>
                  <Badge>{t.mode}</Badge>
                  <Badge variant="amber">{t.entryCount} entries</Badge>
                </div>
              </div>
              <p className="mt-2 font-mono text-[11px] text-slate-500">
                {new Date(t.startsAt).toLocaleString()} → {new Date(t.endsAt).toLocaleString()}
              </p>
              <div className="mt-3 space-y-1">
                {t.problems?.slice(0, 5).map((p: any) => (
                  <div key={p.ordinal} className="text-sm text-slate-700">
                    <span className="font-mono text-slate-500">#{p.ordinal}</span> {p.challenge?.title}{" "}
                    <span className="text-slate-500">D{p.challenge?.difficulty}</span>
                  </div>
                ))}
              </div>
              {t.standings?.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Live standings</p>
                  {t.standings.slice(0, 5).map((s: any) => (
                    <div key={s.userId} className="flex justify-between text-sm">
                      <span>
                        #{s.rank} {s.name}
                      </span>
                      <span className="font-mono text-orange-800">{s.score}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                {t.mode !== "AI" && t.status !== "COMPLETED" && t.status !== "CANCELLED" ? (
                  <Button size="sm" onClick={() => void register(t.id)}>
                    Register
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500">
                    {t.mode === "AI" ? "AI-only — use benchmark API" : "Registration closed"}
                  </span>
                )}
              </div>
            </article>
          ))}
          {!tournaments.length && (
            <p className="rounded-xl border border-slate-200 px-4 py-10 text-center text-slate-500">
              No tournaments scheduled. Admins can create via API; weekly heat appears under Contest.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
