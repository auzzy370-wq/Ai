"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { settingsTabsForRole } from "@/lib/access";
import { trackOptionGroups } from "@/lib/tracks";

type Tab = "account" | "preferences" | "security" | "sessions" | "privacy";

export function SettingsClient({ role }: { role: string }) {
  const allowedTabs = settingsTabsForRole(role as never);
  const [tab, setTab] = useState<Tab>(allowedTabs[0] ?? "account");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [githubLogin, setGithubLogin] = useState("");
  const [track, setTrack] = useState("SOFTWARE_ENGINEERING");
  const [accommodations, setAccommodations] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [languages, setLanguages] = useState("");
  const [frameworks, setFrameworks] = useState("");
  const [databases, setDatabases] = useState("");
  const [cloud, setCloud] = useState("");
  const [infrastructure, setInfrastructure] = useState("");
  const [cybersecurity, setCybersecurity] = useState("");
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function splitList(value: string) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/settings");
    const json = await res.json();
    if (!json.ok) {
      toast.error(json.error?.message || "Could not load settings");
      setLoading(false);
      return;
    }
    const d = json.data;
    setData(d);
    setName(d.account.name ?? "");
    setGithubLogin(d.account.githubLogin ?? "");
    setTrack(d.profile?.preferredTrack ?? "SOFTWARE_ENGINEERING");
    setAccommodations(d.profile?.accommodations ?? "");
    setHeadline(d.profile?.headline ?? "");
    setBio(d.profile?.bio ?? "");
    setPortfolioUrl(d.profile?.portfolioUrl ?? "");
    setGithubUrl(d.profile?.githubUrl ?? "");
    setLinkedInUrl(d.profile?.linkedInUrl ?? "");
    setYearsExperience(
      d.profile?.yearsExperience != null ? String(d.profile.yearsExperience) : "",
    );
    setLanguages((d.profile?.languages ?? []).join(", "));
    setFrameworks((d.profile?.frameworks ?? []).join(", "));
    setDatabases((d.profile?.databases ?? []).join(", "));
    setCloud((d.profile?.cloud ?? []).join(", "));
    setInfrastructure((d.profile?.infrastructure ?? []).join(", "));
    setCybersecurity((d.profile?.cybersecurity ?? []).join(", "));
    setPublicEnabled(Boolean(d.profile?.publicEnabled));
    setPublicSlug(d.profile?.publicSlug ?? "");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveAccount() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, githubLogin }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Save failed");
      toast.success("Account updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePreferences() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preferredTrack: track,
          accommodations,
          headline,
          bio,
          portfolioUrl,
          githubUrl,
          linkedInUrl,
          yearsExperience: yearsExperience === "" ? null : Number(yearsExperience),
          languages: splitList(languages),
          frameworks: splitList(frameworks),
          databases: splitList(databases),
          cloud: splitList(cloud),
          infrastructure: splitList(infrastructure),
          cybersecurity: splitList(cybersecurity),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Save failed");
      toast.success("Preferences saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePrivacy() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicEnabled, publicSlug }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Save failed");
      toast.success("Privacy settings saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Password change failed");
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Password change failed");
    } finally {
      setBusy(false);
    }
  }

  async function revokeSession(sessionId?: string, allOthers?: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/settings/sessions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(allOthers ? { allOthers: true } : { sessionId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Could not revoke");
      toast.success(allOthers ? "Other sessions signed out" : "Session revoked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke");
    } finally {
      setBusy(false);
    }
  }

  const tabLabels: Record<Tab, string> = {
    account: "Account",
    preferences: "Preferences",
    privacy: "Privacy",
    security: "Security",
    sessions: "Sessions",
  };
  const tabs = allowedTabs.map((id) => ({ id, label: tabLabels[id] }));

  if (loading) {
    return <p className="text-slate-600">Loading settings…</p>;
  }
  if (!data) {
    return <p className="text-rose-700">Settings unavailable</p>;
  }

  const isCandidate = data.account.role === "CANDIDATE" || data.account.role === "TEAM_MEMBER";

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">YOUR ACCOUNT</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Manage profile preferences, privacy, password, and active sessions — one place for how Crucible works for you.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">Plan</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xl text-slate-900">{data.account.plan}</span>
              {data.account.plan === "PREMIUM" && <Badge variant="amber">Premium</Badge>}
            </div>
            {data.account.plan !== "PREMIUM" && (
              <Link href="/pricing" className="mt-2 inline-block text-sm text-amber-800 hover:underline">
                Upgrade →
              </Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">Streak</div>
            <div className="mt-1 font-mono text-xl text-orange-800">{data.stats.currentStreak} day</div>
            <div className="text-xs text-slate-500">Best {data.stats.longestStreak}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">Activity</div>
            <div className="mt-1 font-mono text-xl text-slate-900">{data.stats.assignments} sessions</div>
            <div className="text-xs text-slate-500">{data.stats.playgrounds} playgrounds</div>
          </CardContent>
        </Card>
      </section>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md border px-3 py-2 text-sm",
              tab === t.id
                ? "border-orange-400/50 bg-orange-500/10 text-orange-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Identity used across scorecards and reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={data.account.email} disabled />
              <p className="font-mono text-[11px] text-slate-500">Email changes require an admin for now.</p>
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>GitHub login</Label>
              <Input value={githubLogin} onChange={(e) => setGithubLogin(e.target.value)} placeholder="handle" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{data.account.role}</Badge>
              <Badge variant="brand">{data.account.plan}</Badge>
            </div>
            <Button disabled={busy} onClick={() => void saveAccount()}>
              Save account
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "preferences" && (
        <Card>
          <CardHeader>
            <CardTitle>Practice preferences</CardTitle>
            <CardDescription>Shapes daily suggestions and your verified profile defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCandidate ? (
              <>
                <div className="space-y-2">
                  <Label>Preferred track</Label>
                  <select
                    className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
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
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Staff engineer · distributed systems"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short verified-craft narrative for reviewers"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Years experience</Label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Portfolio URL</Label>
                    <Input
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/…"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Languages (comma-separated)</Label>
                  <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="TypeScript, Go, Python" />
                </div>
                <div className="space-y-2">
                  <Label>Frameworks / stacks</Label>
                  <Input value={frameworks} onChange={(e) => setFrameworks(e.target.value)} placeholder="Next.js, FastAPI" />
                </div>
                <div className="space-y-2">
                  <Label>Databases</Label>
                  <Input value={databases} onChange={(e) => setDatabases(e.target.value)} placeholder="Postgres, Redis" />
                </div>
                <div className="space-y-2">
                  <Label>Cloud</Label>
                  <Input value={cloud} onChange={(e) => setCloud(e.target.value)} placeholder="AWS, GCP" />
                </div>
                <div className="space-y-2">
                  <Label>Infrastructure</Label>
                  <Input
                    value={infrastructure}
                    onChange={(e) => setInfrastructure(e.target.value)}
                    placeholder="Kubernetes, Terraform"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cybersecurity</Label>
                  <Input
                    value={cybersecurity}
                    onChange={(e) => setCybersecurity(e.target.value)}
                    placeholder="AppSec, threat modeling"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accommodations</Label>
                  <Textarea
                    value={accommodations}
                    onChange={(e) => setAccommodations(e.target.value)}
                    placeholder="Optional notes for hiring reviewers (extra time, etc.)"
                  />
                </div>
                <Button disabled={busy} onClick={() => void savePreferences()}>
                  Save preferences
                </Button>
                <p className="text-sm text-slate-500">
                  Résumé uploads and skill evidence also live on{" "}
                  <Link href="/candidates" className="text-orange-700 hover:underline">
                    My profile →
                  </Link>
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Hiring-team accounts use Assessments and Reviews. Candidate-track preferences appear when you use a
                candidate demo or personal practice account.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "privacy" && (
        <Card>
          <CardHeader>
            <CardTitle>Privacy & sharing</CardTitle>
            <CardDescription>Control what employers can see on your public scorecard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCandidate ? (
              <>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={publicEnabled}
                    onChange={(e) => setPublicEnabled(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>
                    Enable public profile at{" "}
                    <span className="font-mono text-orange-800">/u/{publicSlug || "your-slug"}</span>
                  </span>
                </label>
                <div className="space-y-2">
                  <Label>Public slug</Label>
                  <Input
                    value={publicSlug}
                    onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="casey-elite"
                  />
                </div>
                <Button disabled={busy} onClick={() => void savePrivacy()}>
                  Save privacy
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-600">Public profiles apply to candidate accounts.</p>
            )}
            <div className="rounded-lg border border-slate-200 bg-white/75 p-4 text-sm text-slate-600">
              Human oversight is mandatory for qualification. Automated scores assist reviewers and never hire on their
              own. Candidate artifacts default to 365-day retention; audit logs keep longer for compliance.
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "security" && (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>At least 10 characters with a letter and a number.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button disabled={busy} onClick={() => void changePassword()}>
              Update password
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "sessions" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Active sessions</CardTitle>
                <CardDescription>Revoke devices you no longer recognize.</CardDescription>
              </div>
              <Button variant="secondary" disabled={busy} onClick={() => void revokeSession(undefined, true)}>
                Sign out other devices
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.sessions ?? []).map((s: any) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{s.current ? "This device" : "Other session"}</span>
                    {s.current && <Badge variant="brand">current</Badge>}
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] text-slate-500">
                    {s.ip || "ip unknown"} · {s.userAgent || "unknown agent"}
                  </div>
                  <div className="font-mono text-[11px] text-slate-600">
                    Started {new Date(s.createdAt).toLocaleString()} · expires {new Date(s.expiresAt).toLocaleString()}
                  </div>
                </div>
                {!s.current && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void revokeSession(s.id)}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
            {!(data.sessions ?? []).length && <p className="text-slate-500">No active sessions.</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-xs text-slate-500">
          <div>APP_URL = {data.environment.appUrl || "unset"}</div>
          <div>EXECUTION_MODE = {data.environment.executionMode}</div>
          <div>AI_FALLBACK_MOCK = {String(data.environment.aiMock)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
