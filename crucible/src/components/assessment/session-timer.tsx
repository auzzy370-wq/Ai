"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SessionTimer(props: {
  endsAt: string | null | undefined;
  timedMinutes?: number | null;
  className?: string;
  compact?: boolean;
}) {
  const endMs = props.endsAt ? new Date(props.endsAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endMs) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endMs]);

  if (!endMs || !Number.isFinite(endMs)) {
    if (!props.timedMinutes) return null;
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-slate-300/80 bg-white/85 px-3 py-1.5 font-mono text-xs text-slate-700",
          props.className,
        )}
      >
        <span className="tracking-[0.2em] text-slate-500">SESSION</span>
        <span>{props.timedMinutes}m</span>
      </div>
    );
  }

  const remaining = endMs - now;
  const expired = remaining <= 0;
  const urgent = !expired && remaining <= 5 * 60 * 1000;
  const warn = !expired && !urgent && remaining <= 15 * 60 * 1000;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs tabular-nums",
        expired
          ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
          : urgent
            ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
            : warn
              ? "border-orange-300/60 bg-orange-500/5 text-orange-900"
              : "border-slate-300/80 bg-white/85 text-slate-800",
        props.className,
      )}
      role="timer"
      aria-live="polite"
      aria-label={expired ? "Assessment time expired" : `Time remaining ${formatRemaining(remaining)}`}
    >
      {!props.compact && (
        <span className="tracking-[0.2em] text-[10px] opacity-70">{expired ? "TIME UP" : "REMAINING"}</span>
      )}
      <span className="text-sm font-semibold tracking-wide">{expired ? "00:00" : formatRemaining(remaining)}</span>
      {props.timedMinutes && !props.compact && (
        <span className="text-[10px] text-slate-500">/ {props.timedMinutes}m</span>
      )}
    </div>
  );
}
