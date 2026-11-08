"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CODING_LANGUAGES, CODING_LANGUAGE_LABELS, type CodingLanguage } from "@/lib/coding-languages";

type DailyPayload = {
  dateKey: string;
  completed: boolean;
  streak: { currentStreak: number; longestStreak: number; lastDateKey: string | null };
  challenge: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    difficulty: number;
    tags: string[];
    avgMinutes: number | null;
    companies: string[];
  };
};

function diffLabel(d: number) {
  if (d <= 3) return "Easy";
  if (d <= 6) return "Medium";
  return "Hard";
}

export function DailyClient(props: { daily: DailyPayload }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<CodingLanguage>("typescript");
  const c = props.daily.challenge;

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/daily", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Could not start");
      toast.success(
        json.data.streak?.currentStreak
          ? `Streak ${json.data.streak.currentStreak} · ${CODING_LANGUAGE_LABELS[lang]}`
          : `Daily unlocked · ${CODING_LANGUAGE_LABELS[lang]}`,
      );
      if (json.data.workspaceId) router.push(`/workspace/${json.data.workspaceId}`);
      else router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-700">STEP 1 · START</p>
          <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Daily evidence session</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            One problem a day. Start opens the IDE — Run public tests, then Submit for the hidden judge.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">Streak {props.daily.streak.currentStreak}</Badge>
          <Badge variant="amber">Best {props.daily.streak.longestStreak}</Badge>
          <Badge>{props.daily.dateKey}</Badge>
        </div>
      </header>

      <Card className="border-orange-300/50 bg-[var(--surface-elevated)]">
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant={c.difficulty <= 3 ? "emerald" : c.difficulty <= 6 ? "amber" : "rose"}>
              {diffLabel(c.difficulty)}
            </Badge>
            {props.daily.completed && <Badge variant="emerald">Completed today</Badge>}
            {[...new Set(c.companies ?? [])].slice(0, 3).map((co) => (
              <Badge key={`co-${co}`} variant="brand">
                {co}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-2xl">{c.title}</CardTitle>
          <CardDescription>{c.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1">
            {c.tags
              .filter((t) => t !== "coding")
              .slice(0, 6)
              .map((t) => (
                <span key={t} className="rounded border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                  {t}
                </span>
              ))}
          </div>
          <p className="text-sm text-slate-600">Suggested time · {c.avgMinutes ?? 30} minutes</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              className="h-11 w-full rounded-md border border-orange-300/60 bg-white px-3 text-sm text-orange-900 sm:w-auto sm:min-w-[10rem]"
              value={lang}
              onChange={(e) => setLang(e.target.value as CodingLanguage)}
            >
              {CODING_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {CODING_LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
            <Button className="w-full sm:w-auto" disabled={busy} onClick={start}>
              {busy ? "Opening…" : props.daily.completed ? "Open again" : "Start daily"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
