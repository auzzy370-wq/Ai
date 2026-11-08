"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useArcadeClear } from "@/components/learn/games/use-arcade-clear";
import { ArcadeClearFx } from "@/components/learn/games/arcade-clear-fx";

const BEATS = [
  { id: "clarify", label: "Clarify", tip: "Inputs, outputs, constraints" },
  { id: "examples", label: "Examples", tip: "Happy path + one edge" },
  { id: "approach", label: "Approach", tip: "Brute force, then optimize" },
  { id: "code", label: "Code", tip: "Narrate while you type" },
  { id: "test", label: "Test", tip: "Walk the example out loud" },
] as const;

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function FrameworkFlowGame() {
  const { reportClear, busy, clearTick, lastXp } = useArcadeClear("framework-flow");
  const [pool, setPool] = useState(() => shuffle([...BEATS]));
  const [picked, setPicked] = useState<(typeof BEATS)[number][]>([]);
  const [status, setStatus] = useState<"play" | "win" | "lose">("play");
  const [seconds, setSeconds] = useState(45);
  const [started, setStarted] = useState(false);
  const reported = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  function start() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    reported.current = false;
    setPool(shuffle([...BEATS]));
    setPicked([]);
    setStatus("play");
    setSeconds(45);
    setStarted(true);
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, 45 - Math.floor((Date.now() - t0) / 1000));
      setSeconds(left);
      if (left <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setStatus((s) => (s === "play" ? "lose" : s));
      }
    }, 250);
  }

  function pick(item: (typeof BEATS)[number]) {
    if (status !== "play" || !started) return;
    setPool((p) => p.filter((x) => x.id !== item.id));
    const next = [...picked, item];
    setPicked(next);
    if (next.length === BEATS.length) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      const ok = next.every((b, i) => b.id === BEATS[i]!.id);
      setStatus(ok ? "win" : "lose");
      if (ok && !reported.current) {
        reported.current = true;
        void reportClear({ perfect: seconds >= 20, score: seconds });
      }
    }
  }

  function undo() {
    if (status !== "play" || !picked.length) return;
    const last = picked[picked.length - 1]!;
    setPicked((p) => p.slice(0, -1));
    setPool((p) => [...p, last]);
  }

  return (
    <div className="relative space-y-5">
      <ArcadeClearFx xp={lastXp} trigger={clearTick} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="brand">Live coding order</Badge>
        <Badge variant={seconds <= 10 ? "rose" : "amber"}>{seconds}s</Badge>
      </div>

      {!started ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-6 text-center">
          <p className="font-serif-display text-xl text-slate-900">Build the five beats</p>
          <p className="mt-2 text-sm text-slate-600">Tap steps in the order you’d use in a real interview loop.</p>
          <Button className="mt-4" onClick={start}>
            Start round
          </Button>
        </div>
      ) : (
        <>
          <ol className="grid gap-2 sm:grid-cols-5">
            {BEATS.map((b, i) => (
              <li
                key={b.id}
                className={cn(
                  "min-h-20 rounded-xl border px-3 py-3 text-center",
                  picked[i]
                    ? picked[i]!.id === b.id
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-rose-300 bg-rose-50"
                    : "border-dashed border-slate-300 bg-white/70",
                )}
              >
                <div className="font-mono text-[10px] text-slate-500">{i + 1}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{picked[i]?.label ?? "—"}</div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2">
            {pool.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => pick(item)}
                className="rounded-xl border border-orange-300 bg-white px-4 py-3 text-left shadow-sm transition hover:border-orange-500"
              >
                <div className="font-medium text-slate-900">{item.label}</div>
                <div className="text-xs text-slate-500">{item.tip}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={undo} disabled={!picked.length || status !== "play"}>
              Undo
            </Button>
            <Button variant="ghost" onClick={start}>
              Restart
            </Button>
          </div>
        </>
      )}

      {status === "win" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
          <p className="font-medium text-emerald-900">Perfect order. That’s the interview loop.</p>
          <p className="mt-1 text-sm text-emerald-800">Clarify → Examples → Approach → Code → Test</p>
          <Button className="mt-3" disabled={busy} onClick={start}>
            Play again
          </Button>
        </div>
      )}
      {status === "lose" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="font-medium text-rose-900">Order slipped or time ran out. Try again.</p>
          <p className="mt-1 text-sm text-rose-800">Remember: never jump straight to code.</p>
          <Button className="mt-3" onClick={start}>
            Play again
          </Button>
        </div>
      )}
    </div>
  );
}
