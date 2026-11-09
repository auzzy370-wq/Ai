"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatScore } from "@/lib/utils";
import { trackLabel, trackOptionGroups, trackBadgeVariant } from "@/lib/tracks";
import type { ProfileDossier } from "@/server/candidates/profile-dossier";

function listToCsv(list: string[] | undefined | null) {
  return (list ?? []).join(", ");
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function CandidateProfilePanel({ dossier: initial }: { dossier: ProfileDossier }) {
  const router = useRouter();
  const [dossier, setDossier] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"overview" | "edit" | "evidence">("overview");

  const p = dossier.profile;
  const [headline, setHeadline] = useState(p.headline ?? "");
  const [bio, setBio] = useState(p.bio ?? "");
  const [preferredTrack, setPreferredTrack] = useState(p.preferredTrack);
  const [yearsExperience, setYearsExperience] = useState(
    p.yearsExperience != null ? String(p.yearsExperience) : "",
  );
  const [portfolioUrl, setPortfolioUrl] = useState(p.portfolioUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(p.githubUrl ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(p.linkedInUrl ?? "");
  const [languages, setLanguages] = useState(listToCsv(p.languages));
  const [frameworks, setFrameworks] = useState(listToCsv(p.frameworks));
  const [databases, setDatabases] = useState(listToCsv(p.databases));
  const [cloud, setCloud] = useState(listToCsv(p.cloud));
  const [infrastructure, setInfrastructure] = useState(listToCsv(p.infrastructure));
  const [cybersecurity, setCybersecurity] = useState(listToCsv(p.cybersecurity));
  const [accommodations, setAccommodations] = useState(p.accommodations ?? "");
  const [publicSlug, setPublicSlug] = useState(p.publicSlug ?? "");
  const [publicEnabled, setPublicEnabled] = useState(Boolean(p.publicEnabled));

  const trackGroups = useMemo(() => trackOptionGroups(), []);
  const nextMissing = dossier.completeness.missing[0] ?? null;

  async function reload() {
    const res = await fetch("/api/candidates/me");
    const json = await res.json();
    if (!json.ok) return;
    // Soft refresh: keep game/stats from server via router.refresh
    setDossier((d) => ({
      ...d,
      profile: json.data,
    }));
    router.refresh();
  }

  async function save() {
    setBusy(true);
    try {
      const years = yearsExperience.trim() === "" ? undefined : Number(yearsExperience);
      if (years != null && (Number.isNaN(years) || years < 0 || years > 60)) {
        throw new Error("Years experience must be 0–60");
      }
      const res = await fetch("/api/candidates/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          headline,
          bio,
          preferredTrack,
          yearsExperience: years,
          portfolioUrl: portfolioUrl || "",
          githubUrl: githubUrl || "",
          linkedInUrl: linkedInUrl || "",
          languages: csvToList(languages),
          frameworks: csvToList(frameworks),
          databases: csvToList(databases),
          cloud: csvToList(cloud),
          infrastructure: csvToList(infrastructure),
          cybersecurity: csvToList(cybersecurity),
          accommodations,
          publicSlug: publicSlug || "",
          publicEnabled,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Save failed");
      setDossier((d) => ({ ...d, profile: json.data }));
      toast.success("Profile saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadResume(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/candidates/me/resume", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Upload failed");
      toast.success("Résumé uploaded — skills marked as claimed only");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const buckets = [
    {
      key: "assessment" as const,
      title: "Assessment verified",
      detail: "Proven under timed judges",
      variant: "emerald" as const,
    },
    {
      key: "humanReview" as const,
      title: "Human reviewed",
      detail: "Signed off by a reviewer",
      variant: "violet" as const,
    },
    {
      key: "portfolio" as const,
      title: "Portfolio backed",
      detail: "Tied to a project link",
      variant: "brand" as const,
    },
    {
      key: "claimed" as const,
      title: "Claimed",
      detail: "Résumé or self-reported — not proof",
      variant: "amber" as const,
    },
  ];

  return (
    <div className="animate-rise space-y-8">
      <header className="overflow-hidden rounded-2xl border border-orange-300/60 bg-[var(--surface-elevated)] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 font-serif-display text-xl text-orange-900 sm:h-20 sm:w-20 sm:text-2xl">
              {dossier.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dossier.user.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                initials(dossier.user.name)
              )}
            </div>
            <div>
              <p className="font-mono text-xs tracking-[0.3em] text-orange-700">CRAFT DOSSIER</p>
              <h1 className="mt-1 font-serif-display text-2xl text-slate-900 sm:text-3xl">{dossier.user.name}</h1>
              <p className="mt-1 max-w-xl text-slate-600">
                {headline.trim() || p.headline || "Add a headline so employers know what you ship."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="amber">
                  Level {dossier.game.level}
                </Badge>
                <Badge variant="brand">{dossier.game.xp.toLocaleString()} XP</Badge>
                <Badge variant={trackBadgeVariant(preferredTrack)}>{trackLabel(preferredTrack)}</Badge>
                {dossier.game.streak.current > 0 && (
                  <Badge variant="emerald">
                    {dossier.game.streak.current}-day streak
                  </Badge>
                )}
                {publicEnabled && publicSlug && <Badge>Public · /u/{publicSlug}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {publicEnabled && publicSlug ? (
              <Link href={`/u/${publicSlug}`} target="_blank">
                <Button variant="secondary">Open public page</Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setTab("edit");
                  requestAnimationFrame(() =>
                    document.getElementById("edit-public")?.scrollIntoView({ behavior: "smooth" }),
                  );
                }}
              >
                Publish profile
              </Button>
            )}
            <Button onClick={() => setTab(tab === "edit" ? "overview" : "edit")}>
              {tab === "edit" ? "Back to overview" : "Edit profile"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Level progress", value: `${dossier.game.levelProgressPct}%`, sub: dossier.game.xpToNext === null ? "Max level" : `${dossier.game.xpToNext} XP to level ${dossier.game.level + 1}` },
            { label: "Verified skills", value: String(dossier.stats.verifiedSkills), sub: `${dossier.stats.humanReviewed} human · ${dossier.stats.claimedSkills} claimed` },
            { label: "Assessments scored", value: String(dossier.stats.assessmentsScored), sub: dossier.stats.bestScore ? `Best ${formatScore(dossier.stats.bestScore)}` : "No scores yet" },
            { label: "Study plans", value: `${dossier.stats.studyCleared}/${dossier.stats.studyEnrolled}`, sub: `${dossier.stats.campaignXp} XP from plans` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
              <p className="mt-1 font-serif-display text-2xl text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Profile completeness · {dossier.completeness.filled}/{dossier.completeness.total}
            </p>
            <span className="font-mono text-xs text-orange-700/80">{dossier.completeness.score}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-[width] duration-700"
              style={{ width: `${dossier.completeness.score}%` }}
            />
          </div>
          {nextMissing && (
            <button
              type="button"
              className="mt-2 text-left text-sm text-orange-700 hover:underline"
              onClick={() => {
                setTab("edit");
                requestAnimationFrame(() =>
                  document.getElementById(nextMissing.href.replace("#", ""))?.scrollIntoView({
                    behavior: "smooth",
                  }),
                );
              }}
            >
              Next: {nextMissing.label} →
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["overview", "Overview"],
            ["evidence", "Skill evidence"],
            ["edit", "Edit & publish"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs transition",
              tab === id
                ? "border-orange-400/50 bg-orange-500/10 text-orange-900"
                : "border-slate-200 text-slate-600 hover:text-slate-800",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-8">
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif-display text-xl text-slate-900">Craft paths</h2>
                <Link href="/learn" className="text-xs text-orange-700 hover:underline">
                  Open Learn →
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {(
                  [
                    ["Interview Craft", dossier.game.paths.interview, "brand"],
                    ["AI Craft", dossier.game.paths.ai, "emerald"],
                  ] as const
                ).map(([title, path, accent]) => (
                  <div key={title}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-800">{title}</span>
                      <span className="font-mono text-xs text-slate-500">
                        {path.done}/{path.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          accent === "brand" ? "bg-orange-500" : "bg-emerald-400",
                        )}
                        style={{ width: `${path.percent}%` }}
                      />
                    </div>
                    {path.nextTitle && (
                      <Link href={path.nextHref} className="mt-1.5 inline-block text-xs text-slate-600 hover:text-orange-700">
                        Next: {path.nextTitle} →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif-display text-xl text-slate-900">Study plans</h2>
                <Link href="/study-plans" className="text-xs text-orange-700 hover:underline">
                  Browse plans →
                </Link>
              </div>
              <ul className="mt-4 space-y-2">
                {dossier.studyCampaigns.length ? (
                  dossier.studyCampaigns.map((c) => (
                    <li
                      key={c.slug}
                      className="rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900">{c.title}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {c.completedCount}/{c.totalCount} problems · {c.earnedXp} XP
                            {c.company ? ` · ${c.company}` : ""}
                          </div>
                        </div>
                        {c.cleared ? <Badge variant="emerald">Done</Badge> : <Badge>{c.percent}%</Badge>}
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", c.cleared ? "bg-emerald-400" : "bg-orange-500")}
                          style={{ width: `${c.percent}%` }}
                        />
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                    No study plans yet.{" "}
                    <Link href="/study-plans" className="text-orange-700 hover:underline">
                      Start one
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/70 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif-display text-xl text-slate-900">Recent assessments</h2>
              <Link href="/challenges" className="text-xs text-orange-700 hover:underline">
                Problem bank →
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {dossier.recentAssessments.length ? (
                dossier.recentAssessments.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{a.title}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {a.status.replaceAll("_", " ")} · {new Date(a.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={trackBadgeVariant(a.track)}>{trackLabel(a.track)}</Badge>
                      {a.overall != null && <Badge variant="emerald">{formatScore(a.overall)}</Badge>}
                      {a.tier && <Badge variant="amber">{a.tier}</Badge>}
                      {a.overall != null && (
                        <Link href={`/scorecard/${a.id}`} className="text-xs text-orange-700 hover:underline">
                          Scorecard
                        </Link>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <li className="py-6 text-center text-sm text-slate-500">No assessments yet — run a timed challenge.</li>
              )}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {buckets.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setTab("evidence")}
                className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-left transition hover:border-orange-300/60"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{b.title}</p>
                <p className="mt-1 font-serif-display text-2xl text-slate-900">
                  {dossier.profile.skillBuckets[b.key].length}
                </p>
                <p className="mt-1 text-xs text-slate-500">{b.detail}</p>
              </button>
            ))}
          </section>
        </div>
      )}

      {tab === "evidence" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white/70 p-5">
            <h2 className="font-serif-display text-xl text-slate-900">Skill evidence lanes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Claimed résumé skills never equal competence. Public profiles only show assessment and human-reviewed skills.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {buckets.map((b) => (
                <div key={b.key} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-slate-900">{b.title}</h3>
                    <Badge variant={b.variant}>{dossier.profile.skillBuckets[b.key].length}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{b.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {dossier.profile.skillBuckets[b.key].length ? (
                      dossier.profile.skillBuckets[b.key].map((s) => (
                        <Badge key={s.id} variant={b.variant}>
                          {s.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-600">None yet</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/70 p-5">
            <h2 className="font-serif-display text-xl text-slate-900">Stack & focus</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["Languages", p.languages],
                  ["Frameworks", p.frameworks],
                  ["Databases", p.databases],
                  ["Cloud", p.cloud],
                  ["Infrastructure", p.infrastructure],
                  ["Cybersecurity", p.cybersecurity],
                ] as const
              ).map(([label, items]) => (
                <div key={label}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items?.length ? (
                      items.map((x) => (
                        <Badge key={x} variant="brand">
                          {x}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-600">Not listed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-4" variant="secondary" onClick={() => setTab("edit")}>
              Edit stack
            </Button>
          </section>

          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
            <h2 className="font-serif-display text-xl text-slate-900">Résumé (PDF)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload extracts claimed skills only. Verification still requires assessments or human review.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Input
                type="file"
                accept="application/pdf"
                disabled={busy}
                className="max-w-sm"
                onChange={(e) => e.target.files?.[0] && void uploadResume(e.target.files[0])}
              />
              <span className="font-mono text-xs text-slate-500">{dossier.stats.resumes} uploaded</span>
            </div>
            {dossier.profile.resumes[0] && (
              <p className="mt-3 text-xs text-slate-500">
                Latest: {dossier.profile.resumes[0].filename} ·{" "}
                {new Date(dossier.profile.resumes[0].uploadedAt).toLocaleString()}
              </p>
            )}
          </section>
        </div>
      )}

      {tab === "edit" && (
        <div className="space-y-6">
          <section id="edit-identity" className="rounded-2xl border border-slate-200 bg-white/70 p-5">
            <h2 className="font-serif-display text-xl text-slate-900">Identity</h2>
            <p className="mt-1 text-sm text-slate-500">How you show up on your dossier and public page.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Headline</Label>
                <Input
                  value={headline}
                  maxLength={160}
                  placeholder="Backend engineer · distributed systems & payments"
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Bio</Label>
                <Textarea
                  value={bio}
                  rows={4}
                  placeholder="What you build, how you work, what you’re hunting for next."
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred track</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={preferredTrack}
                  onChange={(e) => setPreferredTrack(e.target.value as typeof preferredTrack)}
                >
                  {trackGroups.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Years experience</Label>
                <Input
                  inputMode="numeric"
                  value={yearsExperience}
                  placeholder="4"
                  onChange={(e) => setYearsExperience(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Portfolio URL</Label>
                <Input value={portfolioUrl} placeholder="https://" onChange={(e) => setPortfolioUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>GitHub URL</Label>
                <Input value={githubUrl} placeholder="https://github.com/…" onChange={(e) => setGithubUrl(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>LinkedIn URL</Label>
                <Input value={linkedInUrl} placeholder="https://linkedin.com/in/…" onChange={(e) => setLinkedInUrl(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Accessibility accommodations</Label>
                <Textarea
                  value={accommodations}
                  rows={2}
                  placeholder="Optional — shared with hiring staff when relevant"
                  onChange={(e) => setAccommodations(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section id="edit-stack" className="rounded-2xl border border-slate-200 bg-white/70 p-5">
            <h2 className="font-serif-display text-xl text-slate-900">Stack</h2>
            <p className="mt-1 text-sm text-slate-500">Comma-separated. Shown on your dossier; claimed, not verified.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["Languages", languages, setLanguages, "TypeScript, Go, Python"],
                  ["Frameworks", frameworks, setFrameworks, "Next.js, FastAPI"],
                  ["Databases", databases, setDatabases, "Postgres, Redis"],
                  ["Cloud", cloud, setCloud, "AWS, GCP"],
                  ["Infrastructure", infrastructure, setInfrastructure, "Kubernetes, Terraform"],
                  ["Cybersecurity focus", cybersecurity, setCybersecurity, "appsec, detection, IAM"],
                ] as const
              ).map(([label, value, setter, placeholder]) => (
                <div key={label} className="space-y-2">
                  <Label>{label}</Label>
                  <Input value={value} placeholder={placeholder} onChange={(e) => setter(e.target.value)} />
                </div>
              ))}
            </div>
          </section>

          <section id="edit-public" className="rounded-2xl border border-orange-300/50 bg-orange-500/[0.04] p-5">
            <h2 className="font-serif-display text-xl text-slate-900">Public qualification page</h2>
            <p className="mt-1 text-sm text-slate-600">
              Share a /u/… link with employers. Only assessment-verified and human-reviewed skills appear publicly.
            </p>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>Public slug</Label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">/u/</span>
                  <Input
                    value={publicSlug}
                    placeholder="casey-elite"
                    onChange={(e) =>
                      setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40))
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={publicEnabled}
                  onChange={(e) => setPublicEnabled(e.target.checked)}
                />
                Publish at /u/{publicSlug || "…"}
              </label>
              {publicEnabled && publicSlug && (
                <Link href={`/u/${publicSlug}`} className="inline-block text-sm text-orange-700 hover:underline" target="_blank">
                  Preview public page →
                </Link>
              )}
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save profile"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setTab("overview")}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
