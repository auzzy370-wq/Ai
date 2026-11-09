import { COMPANIES } from "@/lib/saas";
import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { JobsClient } from "@/components/jobs/jobs-client";
import { flattenJobs, getJobBoard } from "@/server/jobs/catalog";
import type { JobPosting } from "@/server/jobs/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function JobsPage() {
  await requirePageRolesOrGuest("/jobs", [...CANDIDATE_ROLES, "SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"]);

  let initialJobs: JobPosting[] = [];
  let initialByCompany: Record<string, { ok: boolean; count: number; error: string | null }> = {};
  let initialRefreshedAt: string | null = null;

  try {
    const board = await getJobBoard();
    initialJobs = flattenJobs(board.results);
    initialByCompany = Object.fromEntries(
      board.results.map((r) => [r.company, { ok: r.ok, count: r.jobs.length, error: r.error ?? null }]),
    );
    initialRefreshedAt = board.refreshedAt;
  } catch {
    // Client will fetch /api/jobs if SSR warm fails.
  }

  return (
    <JobsClient
      companies={COMPANIES}
      initialJobs={initialJobs}
      initialByCompany={initialByCompany}
      initialRefreshedAt={initialRefreshedAt}
    />
  );
}
