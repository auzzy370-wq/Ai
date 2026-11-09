import { z } from "zod";
import { COMPANIES } from "@/lib/saas";
import { jsonOk, withHandler } from "@/server/auth/api";
import { flattenJobs, getJobBoard } from "@/server/jobs/catalog";

const Query = z.object({
  company: z.string().optional(),
  q: z.string().optional(),
  refresh: z.enum(["1", "true"]).optional(),
});

export async function GET(req: Request) {
  return withHandler(async () => {
    const url = new URL(req.url);
    const parsed = Query.parse({
      company: url.searchParams.get("company") || undefined,
      q: url.searchParams.get("q") || undefined,
      refresh: url.searchParams.get("refresh") || undefined,
    });

    const board = await getJobBoard({ force: Boolean(parsed.refresh) });
    let jobs = flattenJobs(board.results);

    if (parsed.company && parsed.company !== "All") {
      jobs = jobs.filter((j) => j.company === parsed.company);
    }
    if (parsed.q?.trim()) {
      const needle = parsed.q.trim().toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(needle) ||
          j.location.toLowerCase().includes(needle) ||
          (j.team?.toLowerCase().includes(needle) ?? false) ||
          j.company.toLowerCase().includes(needle),
      );
    }

    const byCompany = Object.fromEntries(
      board.results.map((r) => [
        r.company,
        { ok: r.ok, count: r.jobs.length, error: r.error ?? null },
      ]),
    );

    return jsonOk({
      jobs,
      total: jobs.length,
      companies: [...COMPANIES],
      byCompany,
      refreshedAt: board.refreshedAt,
      cached: board.cached,
    });
  });
}
