"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { difficultyBand } from "@/lib/difficulty";

type HistoryRow = {
  id: string;
  type: string;
  status: string;
  passed: number | null;
  total: number | null;
  runtimeMs: number | null;
  memoryKb: number | null;
  createdAt: string;
};

type Related = {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  tags: string[];
  isPremium: boolean;
};

type PracticePayload = {
  hints: string[];
  stats: {
    submissions: number;
    accepted: number;
    acceptancePct: number | null;
    live: boolean;
  };
  related: Related[];
  bookmarked: boolean;
  history: HistoryRow[];
  challenge: { id: string; slug: string; title: string };
};

export function PracticeAssist(props: {
  challengeSlug: string;
  workspaceId: string;
  onCustomRun?: () => void;
}) {
  const [tab, setTab] = useState<"hints" | "history" | "custom" | "related" | "discuss">("hints");
  const [data, setData] = useState<PracticePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [hintReveal, setHintReveal] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [customJson, setCustomJson] = useState(
    '[\n  { "name": "my_case", "args": [], "expected": null }\n]',
  );
  const [customBusy, setCustomBusy] = useState(false);
  const [discussPosts, setDiscussPosts] = useState<
    {
      id: string;
      body: string;
      createdAt: string;
      author: { id: string; name: string };
      replies: { id: string; body: string; createdAt: string; author: { id: string; name: string } }[];
    }[]
  >([]);
  const [discussBody, setDiscussBody] = useState("");
  const [discussBusy, setDiscussBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/practice/${encodeURIComponent(props.challengeSlug)}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Failed to load practice data");
      setData(json.data);
      setBookmarked(Boolean(json.data.bookmarked));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Practice assist failed");
    } finally {
      setLoading(false);
    }
  }, [props.challengeSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleBookmark() {
    if (!data) return;
    try {
      if (bookmarked) {
        const res = await fetch(`/api/bookmarks?challengeId=${encodeURIComponent(data.challenge.id)}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message || "Could not remove bookmark");
        setBookmarked(false);
        toast.message("Bookmark removed");
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ challengeId: data.challenge.id }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message || "Could not bookmark");
        setBookmarked(true);
        toast.success("Bookmarked");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bookmark failed");
    }
  }

  async function runCustom() {
    setCustomBusy(true);
    try {
      const parsed = JSON.parse(customJson) as { name?: string; args: unknown[]; expected?: unknown }[];
      if (!Array.isArray(parsed) || !parsed.length) throw new Error("Provide a non-empty JSON array of cases");
      const res = await fetch(`/api/workspace/${props.workspaceId}/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "test", customCases: parsed }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Custom run failed");
      toast.message("Custom cases queued — check Judge panel");
      props.onCustomRun?.();
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid custom cases");
    } finally {
      setCustomBusy(false);
    }
  }

  async function loadDiscuss() {
    try {
      const res = await fetch(`/api/discussions/${encodeURIComponent(props.challengeSlug)}`);
      const json = await res.json();
      if (json.ok) setDiscussPosts(json.data.posts ?? []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (tab === "discuss") void loadDiscuss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, props.challengeSlug]);

  async function postDiscussion() {
    if (!discussBody.trim()) return;
    setDiscussBusy(true);
    try {
      const res = await fetch(`/api/discussions/${encodeURIComponent(props.challengeSlug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: discussBody.trim() }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Post failed");
      setDiscussBody("");
      toast.success("Posted");
      void loadDiscuss();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post");
    } finally {
      setDiscussBusy(false);
    }
  }

  const tabs = [
    ["hints", "Hints"],
    ["history", "History"],
    ["custom", "Custom"],
    ["related", "Related"],
    ["discuss", "Discuss"],
  ] as const;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-md px-2.5 py-1 text-xs",
                tab === id ? "bg-orange-500/15 text-orange-900" : "text-slate-500 hover:text-slate-700",
              )}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void toggleBookmark()}
          className={cn(
            "rounded-md border px-2 py-1 text-xs",
            bookmarked
              ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
              : "border-slate-300 text-slate-600 hover:text-slate-800",
          )}
          title={bookmarked ? "Remove bookmark" : "Bookmark problem"}
        >
          {bookmarked ? "★ Saved" : "☆ Bookmark"}
        </button>
      </div>

      <div className="space-y-3 p-3 text-sm">
        {loading && <p className="text-slate-500">Loading practice data…</p>}

        {!loading && data && tab === "hints" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Progressive hints — reveal one at a time. Official grading never uses these.
            </p>
            {data.stats.live && data.stats.acceptancePct != null && (
              <p className="font-mono text-[11px] text-slate-600">
                Live acceptance {data.stats.acceptancePct}% · {data.stats.accepted}/{data.stats.submissions}{" "}
                hidden submits
              </p>
            )}
            {data.hints.slice(0, hintReveal).map((h, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-black/30 px-3 py-2 text-slate-700">
                <span className="font-mono text-[10px] text-slate-500">Hint {i + 1}</span>
                <p className="mt-1">{h}</p>
              </div>
            ))}
            {hintReveal < data.hints.length ? (
              <Button size="sm" variant="secondary" onClick={() => setHintReveal((n) => n + 1)}>
                Reveal hint {hintReveal + 1}/{data.hints.length}
              </Button>
            ) : (
              <p className="text-xs text-slate-500">All hints revealed.</p>
            )}
          </div>
        )}

        {!loading && data && tab === "history" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Your runs on this problem (newest first).</p>
            {!data.history.length && <p className="text-slate-500">No submissions yet — Run or Submit to start a trail.</p>}
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {data.history.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-slate-700"
                >
                  <span>
                    {h.type} · {h.status}
                    {h.passed != null && h.total != null ? ` · ${h.passed}/${h.total}` : ""}
                    {h.runtimeMs != null ? ` · ${h.runtimeMs}ms` : ""}
                  </span>
                  <span className="text-slate-500">{new Date(h.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        )}

        {!loading && tab === "custom" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              JSON array of cases:{" "}
              <code className="rounded border border-[var(--code-chip-border)] bg-[var(--code-chip-bg)] px-1 font-mono text-[var(--code-chip-fg)]">
                args
              </code>{" "}
              passed to{" "}
              <code className="rounded border border-[var(--code-chip-border)] bg-[var(--code-chip-bg)] px-1 font-mono text-[var(--code-chip-fg)]">
                solve(...)
              </code>
              . Optional{" "}
              <code className="rounded border border-[var(--code-chip-border)] bg-[var(--code-chip-bg)] px-1 font-mono text-[var(--code-chip-fg)]">
                expected
              </code>
              . Not used for grading.
            </p>
            <Textarea
              className="min-h-[140px] font-mono text-xs"
              value={customJson}
              onChange={(e) => setCustomJson(e.target.value)}
            />
            <Button size="sm" disabled={customBusy} onClick={() => void runCustom()}>
              {customBusy ? "Queuing…" : "Run custom cases"}
            </Button>
          </div>
        )}

        {!loading && data && tab === "related" && (
          <ul className="space-y-2">
            {!data.related.length && <p className="text-slate-500">No related problems yet.</p>}
            {data.related.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-slate-900">{r.title}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                      {difficultyBand(r.difficulty)} · {r.tags.filter((t) => t !== "coding").slice(0, 3).join(", ")}
                    </div>
                  </div>
                  <Link href={`/challenges?q=${encodeURIComponent(r.slug)}`} className="text-xs text-orange-400 hover:underline">
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "discuss" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Share approaches and edge cases. Do not paste full solutions during timed assessments.
            </p>
            <Textarea
              className="min-h-[80px] text-sm"
              placeholder="Ask a question or share an approach…"
              value={discussBody}
              onChange={(e) => setDiscussBody(e.target.value)}
            />
            <Button size="sm" disabled={discussBusy} onClick={() => void postDiscussion()}>
              {discussBusy ? "Posting…" : "Post"}
            </Button>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {!discussPosts.length && <li className="text-slate-500">No discussion yet — start the thread.</li>}
              {discussPosts.map((p) => (
                <li key={p.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{p.author.name}</span>
                    <span>{new Date(p.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{p.body}</p>
                  {p.replies?.length ? (
                    <ul className="mt-2 space-y-1 border-l border-slate-200 pl-3">
                      {p.replies.map((r) => (
                        <li key={r.id} className="text-xs text-slate-600">
                          <span className="text-slate-500">{r.author.name}: </span>
                          {r.body}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
