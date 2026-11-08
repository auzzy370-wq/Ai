"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ARCADE_CLEAR_XP,
  ARCADE_GAMES,
  ARCADE_PERFECT_BONUS_XP,
  type ArcadeGameDef,
} from "@/server/learning/arcade-games";

type GameRow = ArcadeGameDef & { done: boolean };

/** Accent borders only — fills always use surface so dark mode stays readable. */
const accentBorder = {
  amber: "border-amber-300 dark:border-amber-400/45",
  emerald: "border-emerald-300 dark:border-emerald-400/45",
  orange: "border-orange-300 dark:border-[var(--brand)]/45",
} as const;

export function ArcadeLobby(props: { completedSlugs: string[] }) {
  const done = useMemo(() => new Set(props.completedSlugs), [props.completedSlugs]);
  const games = useMemo(() => ARCADE_GAMES.map((g) => ({ ...g, done: done.has(g.slug) })), [done]);
  const clearedCount = games.filter((g) => g.done).length;
  const continueGame = games.find((g) => !g.done) ?? null;
  const percent = Math.round((clearedCount / Math.max(1, games.length)) * 100);

  return (
    <div className="animate-rise min-w-0 space-y-8">
      <header className="relative min-w-0 overflow-hidden rounded-2xl border border-[var(--brand)]/30 bg-[var(--surface-elevated)] p-5 sm:p-7">
        <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-[0.3em] text-[var(--brand)]">LEARN · ARCADE</p>
            <h1 className="mt-2 font-serif-display text-2xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-3xl">
              Short games for core patterns
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--muted)] sm:text-base">
              {games.length} hand-built games, two to three minutes each. Each one drills a single idea you&apos;ll
              use in interviews. +{ARCADE_CLEAR_XP} XP on first clear, +{ARCADE_PERFECT_BONUS_XP} for a perfect run.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="brand">
                {clearedCount}/{games.length} cleared
              </Badge>
            </div>
          </div>
          {continueGame && (
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-[var(--surface-elevated)] p-4 sm:w-auto">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Up next</p>
              <p className="mt-1 font-medium text-slate-900">{continueGame.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {continueGame.skill} · {continueGame.minutes} min
              </p>
              <div className="mt-3">
                <Link href={`/learn/games/${continueGame.slug}`}>
                  <Button size="sm">Play</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </header>

      <section className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">All games</h2>
          <Link href="/learn" className="text-sm text-[var(--brand)] hover:underline">
            ← Learn
          </Link>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {games.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>
      </section>
    </div>
  );
}

function GameCard({ game }: { game: GameRow }) {
  return (
    <article
      className={cn(
        "min-w-0 rounded-2xl border bg-[var(--surface-elevated)] p-4 sm:p-5",
        accentBorder[game.accent],
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">{game.skill}</Badge>
        <Badge>{game.minutes} min</Badge>
        {game.done && <Badge variant="emerald">cleared</Badge>}
      </div>
      <h3 className="mt-3 font-serif-display text-lg font-semibold text-slate-900">{game.title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{game.blurb}</p>
      <div className="mt-4">
        <Link href={`/learn/games/${game.slug}`}>
          <Button size="sm">{game.done ? "Play again" : "Play"}</Button>
        </Link>
      </div>
    </article>
  );
}
