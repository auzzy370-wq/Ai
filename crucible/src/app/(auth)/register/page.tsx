"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CrucibleLockup } from "@/components/brand/crucible-lockup";
import { trackOptionGroups } from "@/lib/tracks";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    track: "SOFTWARE_ENGINEERING",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          track: form.track,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Registration failed");
      if (json.data?.needsVerification) {
        setPendingEmail(json.data.email || form.email);
        toast.success("Check your email to verify your account");
        return;
      }
      toast.success("Account created — welcome to Crucible");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-root relative flex min-h-screen items-center justify-center px-4 py-10 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(13,148,136,0.12),transparent_50%)]" />
      <Card className="animate-rise relative w-full max-w-lg border-slate-200 bg-[var(--surface-elevated)] shadow-2xl shadow-black/40">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <CrucibleLockup href="/" size="md" />
            <ThemeToggle />
          </div>
          <div>
            <CardTitle className="font-serif-display text-2xl tracking-tight">Start learning free</CardTitle>
            <CardDescription className="mt-2">
              Free learner account: save XP and streaks, open practice workspaces, and build a profile as you finish
              real work. Hidden judging needs a Docker worker when enabled.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {pendingEmail ? (
            <div className="space-y-4 rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-5 text-sm text-slate-200">
              <p className="font-medium text-orange-100">Verify your email to finish signup</p>
              <p>
                We sent a link to <span className="font-mono text-orange-50">{pendingEmail}</span>. Open it to
                activate your account — nothing is live until that inbox is confirmed.
              </p>
              <p className="text-slate-400">
                Didn&apos;t get it? Check spam, or{" "}
                <button
                  type="button"
                  className="text-orange-300 underline"
                  onClick={() => {
                    setPendingEmail(null);
                    setError(null);
                  }}
                >
                  try again
                </button>
                .
              </p>
              <p className="text-center text-sm text-slate-500">
                <Link className="text-orange-700 hover:underline" href="/login">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : null}
          <form
            className={`space-y-4 ${pendingEmail ? "hidden" : ""}`}
            onSubmit={onSubmit}
            suppressHydrationWarning
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                required
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                required
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <p className="font-mono text-[11px] text-slate-500">At least 10 characters, with a letter and a number.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                required
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="track">Preferred track</Label>
              <select
                id="track"
                className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 sm:text-sm"
                value={form.track}
                onChange={(e) => setForm((f) => ({ ...f, track: e.target.value }))}
                suppressHydrationWarning
              >
                {trackOptionGroups().map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {error && (
              <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}
            <Button className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Start learning"}
            </Button>
          </form>
          <div className="mt-5">
            <SocialAuthButtons heading="Or sign up with" />
          </div>
          <p className="mt-4 text-center text-sm text-slate-600">
            Already learning?{" "}
            <Link className="text-orange-700 hover:underline" href="/login">
              Sign in
            </Link>
            {" · "}
            <Link className="text-slate-600 hover:underline" href="/login?intent=hire">
              Hire talent
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
