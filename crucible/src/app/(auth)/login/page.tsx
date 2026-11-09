"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CrucibleLockup } from "@/components/brand/crucible-lockup";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const hireIntent = params.get("intent") === "hire";
  const [mode, setMode] = useState<"learn" | "hire">(hireIntent ? "hire" : "learn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(params.get("oauth_error"));

  useEffect(() => {
    setMode(hireIntent ? "hire" : "learn");
  }, [hireIntent]);

  useEffect(() => {
    const oauthError = params.get("oauth_error");
    if (oauthError) setError(oauthError);
    const verified = params.get("verified");
    if (verified === "1") toast.success("Email verified — you are signed in");
    if (verified === "invalid") setError("That verification link is invalid or expired.");
    if (verified === "exists") toast.message("Account already exists — sign in");
  }, [params]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/setup", { cache: "no-store" });
        if (!res.ok) {
          setDbOk(null);
          return;
        }
        const json = await res.json();
        setDbOk(Boolean(json?.data?.databaseReachable));
      } catch {
        setDbOk(null);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      type LoginJson = { ok?: boolean; error?: { message?: string } };
      let json: LoginJson | null = null;
      try {
        json = text ? (JSON.parse(text) as LoginJson) : null;
      } catch {
        json = null;
      }
      if (!res.ok || !json?.ok) {
        const gateway =
          res.status === 504 || res.status === 502 || res.status === 503
            ? "Login timed out on the server. Retry once — cold starts can be slow."
            : null;
        throw new Error(json?.error?.message || gateway || `Login failed (${res.status})`);
      }
      toast.success("Authenticated");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      let message = err instanceof Error ? err.message : "Login failed";
      if (/load failed|failed to fetch|networkerror/i.test(message)) {
        message = "Could not reach the server. Refresh and try again.";
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="animate-rise relative w-full max-w-md border-slate-200 bg-[var(--surface-elevated)] shadow-2xl shadow-black/40">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <CrucibleLockup href="/" size="md" />
          <ThemeToggle />
        </div>
        <div>
          <CardTitle className="font-serif-display text-2xl tracking-tight">
            {mode === "hire" ? "Hire on evidence" : "Learn by proving"}
          </CardTitle>
          <CardDescription className="mt-2">
            {mode === "hire"
              ? "Staff sign-in for assigning assessments and reviewing scorecards. The hiring loop stays lean on this deploy."
              : "Sign in to save XP, open workspaces, and continue lessons. Hidden judging needs a Docker worker when enabled."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            className={cn(
              "min-h-10 rounded-md text-sm font-medium transition",
              mode === "learn"
                ? "bg-[var(--surface-elevated)] text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800",
            )}
            onClick={() => setMode("learn")}
          >
            I want to learn
          </button>
          <button
            type="button"
            className={cn(
              "min-h-10 rounded-md text-sm font-medium transition",
              mode === "hire"
                ? "bg-[var(--surface-elevated)] text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800",
            )}
            onClick={() => setMode("hire")}
          >
            I want to hire
          </button>
        </div>

        {mode === "learn" && (
          <p className="mb-5 text-sm text-slate-500">
            New here?{" "}
            <Link className="font-medium text-orange-600 hover:text-orange-500" href="/register">
              Create a free learner account →
            </Link>
          </p>
        )}
        {mode === "hire" && (
          <p className="mb-5 text-sm text-slate-500">
            Hiring workspaces use invited staff accounts. Exploring?{" "}
            <Link className="font-medium text-orange-600 hover:text-orange-500" href="/register">
              Start as a learner →
            </Link>
          </p>
        )}

        {dbOk === false && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
            Database is not connected on this deploy yet. Publish with Postgres enabled, then register a new account.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={onSubmit} suppressHydrationWarning>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button className="w-full" disabled={loading || dbOk === false}>
            {loading ? "Entering…" : mode === "hire" ? "Enter hiring workspace" : "Continue learning"}
          </Button>
        </form>
        <div className="mt-5">
          <SocialAuthButtons />
        </div>
        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === "hire" ? (
            <>
              Looking to practice instead?{" "}
              <button type="button" className="font-medium text-orange-600 hover:text-orange-500" onClick={() => setMode("learn")}>
                Switch to learn
              </button>
            </>
          ) : (
            <>
              Hiring talent?{" "}
              <button type="button" className="font-medium text-orange-600 hover:text-orange-500" onClick={() => setMode("hire")}>
                Switch to hire
              </button>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="landing-root relative flex min-h-screen items-center justify-center px-4 py-10 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(13,148,136,0.12),transparent_50%)]" />
      <Suspense fallback={<div className="text-slate-500">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
