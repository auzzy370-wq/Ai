"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useArcadeClear } from "@/components/learn/games/use-arcade-clear";
import { ArcadeClearFx } from "@/components/learn/games/arcade-clear-fx";

const ROUNDS = [
  { prompt: "Scan an unsorted array once", answer: "O(n)", decoys: ["O(1)", "O(n log n)", "O(n²)"] },
  { prompt: "Binary search on a sorted list", answer: "O(log n)", decoys: ["O(n)", "O(1)", "O(n²)"] },
  { prompt: "Hash map average lookup", answer: "O(1)", decoys: ["O(n)", "O(log n)", "O(n log n)"] },
  { prompt: "Nested loop over n×n pairs", answer: "O(n²)", decoys: ["O(n)", "O(n log n)", "O(2ⁿ)"] },
  { prompt: "Comparison sort (merge / heap)", answer: "O(n log n)", decoys: ["O(n)", "O(log n)", "O(n²)"] },
  { prompt: "Check if a digit is even", answer: "O(1)", decoys: ["O(n)", "O(log n)", "O(n²)"] },
];

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function BigOBlitzGame() {
  const { reportClear, busy, clearTick, lastXp } = useArcadeClear("big-o-blitz");
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [done, setDone] = useState(false);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);

  const round = ROUNDS[idx]!;
  const choices = useMemo(() => shuffle([round.answer, ...round.decoys]), [idx, started]);

  useEffect(() => {
    if (!started || done) return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, 60 - Math.floor((Date.now() - t0) / 1000));
      setSeconds(left);
      if (left <= 0) {
        window.clearInterval(id);
        setDone(true);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [started, done]);

  useEffect(() => {
    if (!done) return;
    const perfect = score >= ROUNDS.length && wrong === 0;
    void reportClear({ perfect, score });
    // intentionally fire once when a run finishes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function start() {
    setIdx(0);
    setScore(0);
    setWrong(0);
    setSeconds(60);
    setDone(false);
    setStarted(true);
    setFlash(null);
  }

  function choose(ans: string) {
    if (done || !started) return;
    const ok = ans === round.answer;
    setFlash(ok ? "ok" : "bad");
    if (ok) setScore((s) => s + 1);
    else setWrong((w) => w + 1);
    window.setTimeout(() => {
      setFlash(null);
      if (idx + 1 >= ROUNDS.length) setDone(true);
      else setIdx((i) => i + 1);
    }, 350);
  }

  return (
    <div className="relative space-y-5">
      <ArcadeClearFx xp={lastXp} trigger={clearTick} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="amber">Complexity match</Badge>
        <div className="flex gap-2">
          <Badge variant="brand">{score}/{ROUNDS.length}</Badge>
          <Badge variant={seconds <= 10 ? "rose" : "amber"}>{seconds}s</Badge>
        </div>
      </div>

      {!started ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
          <p className="font-serif-display text-xl text-slate-900">Name the Big-O</p>
          <p className="mt-2 text-sm text-slate-600">Six prompts. Sixty seconds. Say it like you would in a loop.</p>
          <Button className="mt-4" onClick={start}>
            Start blitz
          </Button>
        </div>
      ) : done ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <p className="font-serif-display text-2xl text-slate-900">
            {score}/{ROUNDS.length} correct
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {wrong === 0 ? "Clean sheet — interviewers love that fluency." : `${wrong} miss(es). Review and retry.`}
          </p>
          <Button className="mt-4" disabled={busy} onClick={start}>
            Play again
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-2xl border bg-white/90 p-5 transition",
            flash === "ok" && "border-emerald-400 bg-emerald-50",
            flash === "bad" && "border-rose-400 bg-rose-50",
            !flash && "border-slate-200",
          )}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Prompt {idx + 1}/{ROUNDS.length}
          </p>
          <h2 className="mt-2 font-serif-display text-2xl text-slate-900">{round.prompt}</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {choices.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => choose(c)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg text-slate-900 transition hover:border-orange-400 hover:bg-orange-50"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
