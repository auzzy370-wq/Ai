import Link from "next/link";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LearnerGameState } from "@/server/learning/gamification";

export function ProgressHero({ game }: { game: LearnerGameState }) {
  return (
    <section className="grid min-w-0 gap-4 rounded-2xl border border-[var(--brand)]/30 bg-[var(--surface-elevated)] p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Level</p>
            <p className="text-4xl font-semibold tracking-[-0.03em] text-slate-900">{game.level}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">XP</p>
            <p className="text-4xl font-semibold tracking-[-0.03em] text-slate-900">{game.xp.toLocaleString()}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">Streak</p>
            <p className="flex items-center gap-1.5 text-4xl font-semibold tracking-[-0.03em] text-slate-900">
              <Flame
                className={cn("h-7 w-7", game.streak.activeToday ? "text-[var(--brand)]" : "text-slate-300")}
                aria-hidden
              />
              {game.streak.current}d
            </p>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between font-mono text-[11px] text-slate-500">
            <span>
              {game.xpToNext === null ? "Max level" : `${game.xpToNext} XP to level ${game.level + 1}`}
            </span>
            <span>{game.levelProgressPct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-700 ease-out"
              style={{ width: `${game.levelProgressPct}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-slate-600">
          {game.streak.activeToday
            ? "Streak counted for today."
            : game.streak.current > 0
              ? "Finish a lesson or today’s problem to keep your streak."
              : "Finish a lesson or today’s problem to start a streak."}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Up next</p>
        <h2 className="mt-1 text-lg font-medium text-slate-900">{game.focus.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{game.focus.detail}</p>
        <div className="mt-3">
          <Link href={game.focus.href}>
            <Button>{game.focus.cta}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
