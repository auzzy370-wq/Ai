"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function WeeklyClient() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/weekly");
    const json = await res.json();
    if (json.ok) setData(json.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markDone() {
    setBusy(true);
    try {
      const res = await fetch("/api/weekly", { method: "POST" });
      const json = await res.json();
      if (!json.ok) return toast.error(json.error?.message || "Failed");
      toast.success("Weekly attempt recorded");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="text-slate-500">Loading this week&apos;s broken-production challenge…</p>;
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-rose-700">WEEKLY BROKEN PRODUCTION</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{data.title}</h1>
        <p className="mt-2 max-w-3xl text-slate-600">{data.synopsis}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="amber">{data.weekKey}</Badge>
          <Badge variant="brand">{data.challenge?.title}</Badge>
          {data.completed && <Badge variant="emerald">Attempted</Badge>}
        </div>
      </header>

      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
        <p className="text-sm text-rose-100/90">
          Same failure for everyone this week. Contain, repair, and leave evidence — not a postmortem slide deck.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.workspaceId ? (
            <Link href={`/workspace/${data.workspaceId}`}>
              <Button>Open workspace</Button>
            </Link>
          ) : (
            <Link href="/assessments">
              <Button variant="secondary">Find assessment</Button>
            </Link>
          )}
          <Button variant="secondary" disabled={busy || data.completed} onClick={markDone}>
            Mark attempted
          </Button>
        </div>
      </div>
    </div>
  );
}
