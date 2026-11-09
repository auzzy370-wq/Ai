"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocalTime } from "@/components/ui/local-time";
import { cn } from "@/lib/utils";
import type { JobCompany, JobPosting, JobSource } from "@/server/jobs/types";

type BoardMeta = { ok: boolean; count: number; error: string | null };

const SOURCE_LABEL: Record<JobSource, string> = {
  greenhouse: "Careers board",
  amazon: "Amazon.jobs",
  google: "Google Careers",
  apple: "Apple Jobs",
  netflix: "Netflix Careers",
  shopify: "Shopify Careers",
  linkedin: "LinkedIn listing",
};

type JobFocus = "all" | "engineering" | "cybersecurity";

const FOCUS_OPTIONS: { id: JobFocus; label: string }[] = [
  { id: "all", label: "All tech" },
  { id: "engineering", label: "Engineering" },
  { id: "cybersecurity", label: "Cybersecurity" },
];

function looksLikeCyber(title: string) {
  return /\b(cyber\s*security|cybersecurity|information security|infosec|appsec|product security|application security|security engineer|security analyst|security architect|security researcher|security consultant|penetration|pen\s*test|red team|blue team|purple team|threat intel|threat intelligence|threat detection|detection engineer|soc analyst|soc engineer|incident response|malware|vulnerability|offensive security|defensive security|cloud security|network security|identity security|zero[\s-]?trust|cryptograph|ciso|grc|devsecops|secure coding)\b/i.test(
    title,
  );
}

function matchesFocus(title: string, focus: JobFocus) {
  if (focus === "all") return true;
  if (focus === "cybersecurity") return looksLikeCyber(title);
  return !looksLikeCyber(title);
}

function sortJobs(list: JobPosting[]) {
  return [...list].sort((a, b) => {
    const aPay = a.salaryMin != null && a.salaryMax != null;
    const bPay = b.salaryMin != null && b.salaryMax != null;
    if (aPay !== bPay) return aPay ? -1 : 1;
    if (aPay && bPay) {
      const aMid = ((a.salaryMin ?? 0) + (a.salaryMax ?? 0)) / 2;
      const bMid = ((b.salaryMin ?? 0) + (b.salaryMax ?? 0)) / 2;
      return bMid - aMid;
    }
    return 0;
  });
}

export function JobsClient(props: {
  companies: readonly JobCompany[];
  initialJobs?: JobPosting[];
  initialByCompany?: Record<string, BoardMeta>;
  initialRefreshedAt?: string | null;
}) {
  const [company, setCompany] = useState<string>("All");
  const [focus, setFocus] = useState<JobFocus>("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [boardJobs, setBoardJobs] = useState<JobPosting[]>(props.initialJobs ?? []);
  const [byCompany, setByCompany] = useState<Record<string, BoardMeta>>(props.initialByCompany ?? {});
  const [refreshedAt, setRefreshedAt] = useState<string | null>(props.initialRefreshedAt ?? null);
  const [loading, setLoading] = useState(!(props.initialJobs && props.initialJobs.length));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Pull the full board once; filters stay client-side for snappy focus/search.
      if (refresh) params.set("refresh", "1");
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Could not load jobs");
      setBoardJobs(json.data.jobs ?? []);
      setByCompany(json.data.byCompany ?? {});
      setRefreshedAt(json.data.refreshedAt ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load jobs";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (props.initialJobs && props.initialJobs.length) return;
    void load(false);
  }, [load, props.initialJobs]);

  const jobs = useMemo(() => {
    const needle = debouncedQ.toLowerCase();
    const filtered = boardJobs.filter((j) => {
      if (company !== "All" && j.company !== company) return false;
      if (!matchesFocus(j.title, focus)) return false;
      if (!needle) return true;
      return (
        j.title.toLowerCase().includes(needle) ||
        j.location.toLowerCase().includes(needle) ||
        (j.team?.toLowerCase().includes(needle) ?? false) ||
        j.company.toLowerCase().includes(needle) ||
        (j.summary?.toLowerCase().includes(needle) ?? false) ||
        (j.salaryLabel?.toLowerCase().includes(needle) ?? false)
      );
    });
    return sortJobs(filtered);
  }, [boardJobs, company, focus, debouncedQ]);

  const companyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of props.companies) counts[c] = 0;
    for (const j of boardJobs) {
      if (!matchesFocus(j.title, focus)) continue;
      counts[j.company] = (counts[j.company] ?? 0) + 1;
    }
    return counts;
  }, [boardJobs, focus, props.companies]);

  const failing = useMemo(
    () =>
      Object.entries(byCompany)
        .filter(([, m]) => !m.ok)
        .map(([name]) => name),
    [byCompany],
  );

  const busy = loading || refreshing;

  return (
    <div className="animate-rise space-y-6">
      <header className="rounded-2xl border border-[var(--brand)]/30 bg-[var(--surface-elevated)] p-5 sm:p-7">
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--brand)]">CAREER LINKS</p>
        <h1 className="mt-2 font-serif-display text-2xl text-slate-900 sm:text-3xl">
          Official openings from company career boards
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Aggregated public postings for software engineering and cybersecurity — not Crucible-hosted applications.
          Cards include a short description and yearly pay when the employer lists it.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Briefcase className="h-3.5 w-3.5" />
          <span>{jobs.length} roles shown</span>
          {jobs.some((j) => j.salaryLabel) ? (
            <span>· {jobs.filter((j) => j.salaryLabel).length} with listed yearly pay</span>
          ) : null}
          {refreshedAt && (
            <span>
              · refreshed <LocalTime value={refreshedAt} />
            </span>
          )}
          {refreshing ? <span>· updating feeds…</span> : null}
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Focus</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          {FOCUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFocus(opt.id)}
              className={cn(
                "shrink-0 rounded-md border px-3 py-2 text-xs transition",
                focus === opt.id
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-slate-900"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Company</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCompany("All")}
            className={cn(
              "shrink-0 rounded-md border px-3 py-2 text-xs transition",
              company === "All"
                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-slate-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50",
            )}
          >
            All
          </button>
          {props.companies.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCompany(c)}
              className={cn(
                "shrink-0 rounded-md border px-3 py-2 text-xs transition",
                company === c
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-slate-900"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              {c}
              <span className="ml-1 text-[10px] text-slate-500">{companyCounts[c] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              focus === "cybersecurity"
                ? "Filter AppSec, SOC, cloud security…"
                : "Filter title, description, location…"
            }
            className="sm:flex-1"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void load(true)}
              disabled={busy}
              aria-label="Refresh job feeds"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {failing.length > 0 && (
          <p className="text-xs text-amber-800">
            Couldn&apos;t refresh: {failing.join(", ")}. Other companies still show.
          </p>
        )}
      </section>

      {loading && !jobs.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm text-slate-500">
          Pulling live openings from company boards…
        </div>
      ) : error && !jobs.length ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-12 text-center text-sm text-rose-900">
          {error}
          <div className="mt-3">
            <Button size="sm" onClick={() => void load(true)}>
              Try again
            </Button>
          </div>
        </div>
      ) : !jobs.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm text-slate-500">
          No roles match that filter. Clear search or pick another company.
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:border-[var(--brand)]/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="brand">{job.company}</Badge>
                    <Badge>{SOURCE_LABEL[job.source]}</Badge>
                    {job.team ? <Badge variant="amber">{job.team}</Badge> : null}
                  </div>
                  <h2 className="font-serif-display text-lg text-slate-900">{job.title}</h2>
                  <p className="text-sm text-slate-600">{job.location}</p>
                  {job.summary ? (
                    <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{job.summary}</p>
                  ) : null}
                  {job.salaryLabel ? (
                    <p className="text-sm font-medium text-slate-900">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--brand)]">
                        Yearly pay
                      </span>
                      <span className="mt-0.5 block">{job.salaryLabel}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Yearly pay not listed on this posting</p>
                  )}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="sm:w-auto">
                    <Button className="w-full sm:w-auto">
                      Apply
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Link href={`/interview`} className="sm:w-auto">
                    <Button variant="secondary" className="w-full sm:w-auto">
                      Prep {job.company} mock
                    </Button>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
