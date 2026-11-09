"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useArcadeClear } from "@/components/learn/games/use-arcade-clear";
import { ArcadeClearFx } from "@/components/learn/games/arcade-clear-fx";

export function BinaryRangeGame() {
  const { reportClear, busy, clearTick, lastXp } = useArcadeClear("binary-range");
  const [low, setLow] = useState(1);
  const [high, setHigh] = useState(100);
  const [guess, setGuess] = useState("");
  const [tries, setTries] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 100));

  const optimal = Math.ceil(Math.log2(100));

  function start() {
    const s = 1 + Math.floor(Math.random() * 100);
    setSeed(s);
    setLow(1);
    setHigh(100);
    setGuess("");
    setTries(0);
    setLog([]);
    setWon(false);
    setStarted(true);
  }

  function submit() {
    if (!started || won) return;
    const g = Number(guess);
    if (!Number.isInteger(g) || g < low || g > high) {
      setLog((l) => [`Stay inside [${low}, ${high}]`, ...l].slice(0, 6));
      return;
    }
    const nextTries = tries + 1;
    setTries(nextTries);
    if (g === seed) {
      setWon(true);
      const perfect = nextTries <= optimal;
      setLog((l) => [`Found ${seed} in ${nextTries} guess(es)`, ...l]);
      void reportClear({ perfect, score: Math.max(0, 20 - nextTries) });
      return;
    }
    if (g < seed) {
      setLow(g + 1);
      setLog((l) => [`${g} too low → search [${g + 1}, ${high}]`, ...l].slice(0, 6));
    } else {
      setHigh(g - 1);
      setLog((l) => [`${g} too high → search [${low}, ${g - 1}]`, ...l].slice(0, 6));
    }
    setGuess("");
  }

  const mid = Math.floor((low + high) / 2);
  const span = high - low + 1;
  const pct = Math.max(2, Math.round((span / 100) * 100));

  return (
    <div className="relative space-y-5">
      <ArcadeClearFx xp={lastXp} trigger={clearTick} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="emerald">Binary search trainer</Badge>
        <Badge variant="amber">{tries} guesses</Badge>
      </div>

      {!started ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
          <p className="font-serif-display text-xl text-slate-900">Halve the space</p>
          <p className="mt-2 text-sm text-slate-600">
            Secret number 1–100. Optimal is about {optimal} guesses. Always pick the midpoint.
          </p>
          <Button className="mt-4" onClick={start}>
            Start search
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Active range</p>
            <p className="mt-1 font-serif-display text-3xl text-slate-900">
              [{low}, {high}]
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                style={{ width: `${pct}%`, marginLeft: `${low - 1}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Hint midpoint: <span className="font-mono text-orange-800">{mid}</span> · {span} values left
            </p>
          </div>

          {!won ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <Input
                className="max-w-[10rem]"
                inputMode="numeric"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder={`Try ${mid}`}
              />
              <Button type="submit">Guess</Button>
              <Button type="button" variant="secondary" onClick={() => setGuess(String(mid))}>
                Use midpoint
              </Button>
            </form>
          ) : (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <p className="font-medium text-emerald-900">
                Locked in {tries} guess{tries === 1 ? "" : "es"}
                {tries <= optimal ? " — optimal band." : "."}
              </p>
              <Button className="mt-3" disabled={busy} onClick={start}>
                New secret
              </Button>
            </div>
          )}

          <ul className="space-y-1">
            {log.map((line, i) => (
              <li key={`${line}-${i}`} className={cn("font-mono text-xs text-slate-600")}>
                {line}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
