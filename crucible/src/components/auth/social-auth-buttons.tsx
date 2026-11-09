"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProviderRow = {
  id: string;
  label: string;
  enabled: boolean;
  startUrl: string;
};

/** Hidden for now — email/password only until OAuth is turned back on. */
const HIDDEN_PROVIDERS = new Set(["google", "github"]);

const ORDER = ["apple", "discord", "facebook", "x"] as const;

function ProviderIcon({ id }: { id: string }) {
  if (id === "apple") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.7-3.4zM14.2 5.8c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.6-1.3z" />
      </svg>
    );
  }
  const mark: Record<string, string> = { discord: "D", facebook: "f", x: "𝕏" };
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center font-mono text-[10px] font-semibold">
      {mark[id] || "•"}
    </span>
  );
}

export function SocialAuthButtons({ heading = "Or continue with" }: { heading?: string }) {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/oauth/providers", { cache: "no-store" });
        const json = await res.json();
        if (json.ok) setProviders(json.data.providers ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const visible = ORDER.map((id) => providers.find((p) => p.id === id))
    .filter((p): p is ProviderRow => Boolean(p?.enabled) && !HIDDEN_PROVIDERS.has(p!.id));

  // Nothing to show while Google/GitHub are hidden and no other providers are configured.
  if (!loaded || visible.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{heading}</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((p) => (
          <Button
            key={p.id}
            variant="secondary"
            className={cn(
              "justify-center gap-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
              p.id === "apple" && "bg-[#12141a] text-white hover:bg-black",
            )}
            asChild
          >
            <a href={p.startUrl}>
              <ProviderIcon id={p.id} />
              {p.label}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
