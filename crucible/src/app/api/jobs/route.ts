import { z } from "zod";
import { COMPANIES } from "@/lib/saas";
import { jsonOk, withHandler } from "@/server/auth/api";
import { flattenJobs, getJobBoard } from "@/server/jobs/catalog";
import { matchesJobFocus, type JobFocus } from "@/server/jobs/decode";

export const maxDuration = 60;

const Query = z.object({
  company: z.string().optional(),
  q: z.string().optional(),
  focus: z.enum(["all", "engineering", "cybersecurity"]).optional(),
  refresh: z.enum(["1", "true"]).optional(),
});

export async function GET(req: Request) {
  return withHandler(async () => {
    const url = new URL(req.url);
    const parsed = Query.parse({
      company: url.searchParams.get("company") || undefined,
      q: url.searchParams.get("q") || undefined,
      focus: url.searchParams.get("focus") || undefined,
      refresh: url.searchParams.get("refresh") || undefined,
    });

    const board = await getJobBoard({ force: Boolean(parsed.refresh) });
    let jobs = flattenJobs(board.results);
    const focus = (parsed.focus ?? "all") as JobFocus;

    if (parsed.company && parsed.company !== "All") {
      jobs = jobs.filter((j) => j.company === parsed.company);
    }
    if (focus !== "all") {
      jobs = jobs.filter((j) => matchesJobFocus(j.title, focus));
    }
    if (parsed.q?.trim()) {
      const needle = parsed.q.trim().toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(needle) ||
          j.location.toLowerCase().includes(needle) ||
          (j.team?.toLowerCase().includes(needle) ?? false) ||
          j.company.toLowerCase().includes(needle) ||
          (j.summary?.toLowerCase().includes(needle) ?? false) ||
          (j.salaryLabel?.toLowerCase().includes(needle) ?? false),
      );
    }

    // Prefer postings that disclose yearly pay, then higher midpoints.
    jobs = [...jobs].sort((a, b) => {
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

    const byCompany = Object.fromEntries(
      board.results.map((r) => [
        r.company,
        {
          ok: r.ok,
          count: r.jobs.filter((j) => (focus === "all" ? true : matchesJobFocus(j.title, focus))).length,
          error: r.error ?? null,
        },
      ]),
    );

    return jsonOk({
      jobs,
      total: jobs.length,
      companies: [...COMPANIES],
      byCompany,
      focus,
      refreshedAt: board.refreshedAt,
      cached: board.cached,
    });
  });
}
