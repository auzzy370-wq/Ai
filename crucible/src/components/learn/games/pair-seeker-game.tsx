"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useArcadeClear } from "@/components/learn/games/use-arcade-clear";
import { ArcadeClearFx } from "@/components/learn/games/arcade-clear-fx";

type Cell = { id: number; value: number; x: number; y: number; r: number; selected: boolean; found: boolean };

function makeLevel(level: number) {
  const target = 10 + level * 3;
  const a = 2 + Math.floor(Math.random() * (target - 4));
  const b = target - a;
  const values = [a, b];
  while (values.length < 8) {
    const v = 1 + Math.floor(Math.random() * (target + 5));
    if (!values.includes(v) || Math.random() > 0.7) values.push(v);
  }
  // shuffle
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  const cells: Cell[] = values.map((value, id) => ({
    id,
    value,
    x: 70 + (id % 4) * 90,
    y: 70 + Math.floor(id / 4) * 100,
    r: 32,
    selected: false,
    found: false,
  }));
  return { target, cells };
}

export function PairSeekerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { reportClear, busy, clearTick, lastXp } = useArcadeClear("pair-seeker");
  const [level, setLevel] = useState(1);
  const [state, setState] = useState(() => makeLevel(1));
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("Tap two numbers that add to the target.");
  const [wins, setWins] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#ecfeff");
    grad.addColorStop(1, "#f0fdf4");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#c43b0d";
    ctx.font = "600 18px IBM Plex Sans, sans-serif";
    ctx.fillText(`Target: ${state.target}`, 24, 36);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText(`Level ${level}/3 · hash-map mindset`, 24, 56);

    for (const c of state.cells) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      if (c.found) ctx.fillStyle = "#86efac";
      else if (c.selected) ctx.fillStyle = "#ff9a66";
      else ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = c.found ? "#059669" : c.selected ? "#c43b0d" : "#cbd5e1";
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 18px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(c.value), c.x, c.y);
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }, [state, level]);

  function hitTest(mx: number, my: number) {
    return state.cells.find((c) => !c.found && (mx - c.x) ** 2 + (my - c.y) ** 2 <= c.r ** 2);
  }

  function onPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!started || finished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const cell = hitTest(mx, my);
    if (!cell) return;

    let nextSel = [...selected];
    if (nextSel.includes(cell.id)) nextSel = nextSel.filter((id) => id !== cell.id);
    else if (nextSel.length < 2) nextSel.push(cell.id);

    const cells = state.cells.map((c) => ({
      ...c,
      selected: nextSel.includes(c.id),
    }));

    if (nextSel.length === 2) {
      const [i, j] = nextSel;
      const a = cells.find((c) => c.id === i)!;
      const b = cells.find((c) => c.id === j)!;
      if (a.value + b.value === state.target) {
        const updated = cells.map((c) =>
          c.id === i || c.id === j ? { ...c, found: true, selected: false } : { ...c, selected: false },
        );
        setState({ ...state, cells: updated });
        setSelected([]);
        const nextWins = wins + 1;
        setWins(nextWins);
        setMessage(`Pair ${a.value}+${b.value}=${state.target}. That’s the complement trick.`);
        if (level >= 3) {
          setFinished(true);
          void reportClear({ perfect: true, score: nextWins });
        } else {
          window.setTimeout(() => {
            setLevel((l) => l + 1);
            setState(makeLevel(level + 1));
            setMessage("New board — find the complement again.");
          }, 650);
        }
      } else {
        setMessage(`${a.value}+${b.value}=${a.value + b.value} ≠ ${state.target}. Need target−x in the map.`);
        setState({ ...state, cells });
        setSelected(nextSel);
        window.setTimeout(() => {
          setSelected([]);
          setState((s) => ({ ...s, cells: s.cells.map((c) => ({ ...c, selected: false })) }));
        }, 450);
      }
    } else {
      setSelected(nextSel);
      setState({ ...state, cells });
      if (nextSel.length === 1) {
        const v = cells.find((c) => c.id === nextSel[0])!.value;
        setMessage(`Need ${state.target - v} next (target − ${v}).`);
      }
    }
  }

  function start() {
    setLevel(1);
    setState(makeLevel(1));
    setSelected([]);
    setWins(0);
    setFinished(false);
    setStarted(true);
    setMessage("Tap two numbers that add to the target.");
  }

  return (
    <div className="relative space-y-4">
      <ArcadeClearFx xp={lastXp} trigger={clearTick} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="brand">Two Sum trainer</Badge>
        <Badge variant="emerald">{wins} pairs</Badge>
      </div>
      {!started ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-6 text-center">
          <p className="font-serif-display text-xl text-slate-900">Find the complement</p>
          <p className="mt-2 text-sm text-slate-600">
            For each pick x, ask: is target−x already seen? That’s the hash-map interview answer.
          </p>
          <Button className="mt-4" onClick={start}>
            Start hunt
          </Button>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={420}
            height={280}
            onPointerDown={onPointer}
            className="w-full max-w-lg cursor-pointer touch-manipulation rounded-2xl border border-slate-200 shadow-sm"
          />
          <p className="text-sm text-slate-600">{message}</p>
          {finished && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <p className="font-medium text-emerald-900">Board cleared. You used the complement pattern.</p>
              <Button className="mt-3" disabled={busy} onClick={start}>
                Play again
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
