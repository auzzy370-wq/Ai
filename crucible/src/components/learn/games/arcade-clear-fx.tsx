"use client";

import { useEffect, useState } from "react";
import { XpBurst } from "@/components/learn/xp-burst";

/** Brief overlay when an arcade drill banks XP. */
export function ArcadeClearFx({
  xp,
  trigger,
}: {
  xp: number;
  trigger: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger || xp <= 0) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 1400);
    return () => window.clearTimeout(t);
  }, [trigger, xp]);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-[var(--brand-soft)]/40" />
      <XpBurst amount={xp} active />
    </div>
  );
}
