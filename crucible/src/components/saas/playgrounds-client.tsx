"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FREE_PLAYGROUND_LIMIT } from "@/lib/saas";

type Playground = {
  id: string;
  name: string;
  folder: string;
  language: string;
  content: string;
  updatedAt: string;
};

export function PlaygroundsClient(props: {
  playgrounds: Playground[];
  premium: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("New playground");
  const [folder, setFolder] = useState("Inbox");
  const [activeId, setActiveId] = useState(props.playgrounds[0]?.id ?? "");
  const active = useMemo(
    () => props.playgrounds.find((p) => p.id === activeId) ?? props.playgrounds[0],
    [props.playgrounds, activeId],
  );
  const [content, setContent] = useState(active?.content ?? "");
  const [busy, setBusy] = useState(false);

  const folders = useMemo(() => {
    const map = new Map<string, Playground[]>();
    for (const p of props.playgrounds) {
      const list = map.get(p.folder) ?? [];
      list.push(p);
      map.set(p.folder, list);
    }
    return [...map.entries()];
  }, [props.playgrounds]);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/playgrounds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, folder }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Create failed");
      toast.success("Playground created");
      setActiveId(json.data.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/playgrounds/${active.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Save failed");
      toast.success("Saved to cloud");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-orange-700">PLAYGROUNDS</p>
          <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Playgrounds</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Scratch pads beside evidence sessions. Free includes {FREE_PLAYGROUND_LIMIT}; Premium is unlimited with
            folders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {props.premium ? <Badge variant="amber">Unlimited</Badge> : <Badge>{props.playgrounds.length}/{FREE_PLAYGROUND_LIMIT}</Badge>}
          {!props.premium && (
            <Link href="/pricing" className="text-sm text-orange-700 hover:underline">
              Upgrade for unlimited →
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create</CardTitle>
            <CardDescription>Folders keep company prep tidy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder" />
            <Button disabled={busy} onClick={create} className="w-full">
              New playground
            </Button>
            <div className="space-y-3 pt-2">
              {folders.map(([folderName, items]) => (
                <div key={folderName}>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">{folderName}</div>
                  <ul className="space-y-1">
                    {items.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`min-h-11 w-full rounded-md px-2 py-2 text-left text-sm ${
                            active?.id === p.id ? "bg-orange-500/10 text-orange-900" : "text-slate-600 hover:bg-slate-100"
                          }`}
                          onClick={() => {
                            setActiveId(p.id);
                            setContent(p.content);
                          }}
                        >
                          {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{active?.name ?? "No playground"}</CardTitle>
              <CardDescription>Cloud storage keeps layouts and code across devices.</CardDescription>
            </div>
            <Button disabled={!active || busy} onClick={save}>
              Save
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[420px] font-mono text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!active}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
