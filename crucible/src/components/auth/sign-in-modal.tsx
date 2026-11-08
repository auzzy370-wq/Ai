"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrucibleLockup } from "@/components/brand/crucible-lockup";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "crucible_guest_free";

export function SignInModal({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  freeHref = "/learn",
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  freeHref?: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : internalOpen;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function setOpen(next: boolean) {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  function continueFree() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    router.push(freeHref);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Sign-in failed");
      toast.success("Signed in");
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        aria-label="Dismiss sign-in"
        onClick={continueFree}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-[81] w-full max-w-md animate-rise rounded-t-2xl border border-slate-200 bg-[var(--surface-elevated)] p-5 shadow-2xl shadow-black/40 sm:rounded-2xl sm:p-6",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <CrucibleLockup href={null} size="sm" />
            <h2 id={titleId} className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
              Sign in to save progress
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Or close this and keep exploring — lessons and the arcade are free.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={continueFree}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="guest-signin-email">Email</Label>
            <Input
              id="guest-signin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-signin-password">Password</Label>
            <Input
              id="guest-signin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          <Button type="button" variant="secondary" className="w-full" onClick={continueFree}>
            Continue free — no account
          </Button>
          <p className="text-center text-sm text-slate-500">
            New here?{" "}
            <Link className="text-orange-700 hover:underline" href="/register">
              Create a free learner account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function shouldAutoOpenSignInModal() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) !== "1";
  } catch {
    return true;
  }
}
