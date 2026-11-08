import { prisma } from "@/lib/db";

/** Progressive hints: stored on Challenge.hints or synthesized from public requirements. */
export function synthesizeHints(input: {
  hints?: unknown;
  title: string;
  summary: string;
  publicRequirements?: unknown;
  tags?: string[];
}): string[] {
  if (Array.isArray(input.hints) && input.hints.every((h) => typeof h === "string") && input.hints.length) {
    return input.hints as string[];
  }
  const reqs = Array.isArray(input.publicRequirements)
    ? (input.publicRequirements as unknown[]).map(String).filter(Boolean)
    : [];
  const tags = (input.tags ?? []).slice(0, 3);
  const hints: string[] = [
    `Start by restating the goal for “${input.title}” in one sentence, then identify inputs and outputs.`,
    tags.length
      ? `This problem leans on: ${tags.join(", ")}. Sketch the core technique before coding.`
      : `Scan the summary for constraints: ${input.summary.slice(0, 140)}${input.summary.length > 140 ? "…" : ""}`,
  ];
  if (reqs[0]) hints.push(`Public check #1 to satisfy: ${reqs[0]}`);
  if (reqs[1]) hints.push(`Next public check: ${reqs[1]}`);
  hints.push(
    "Write a brute-force correct solution first, then optimize. Name edge cases (empty, single element, max size) before submitting.",
  );
  return hints.slice(0, 5);
}

export async function challengeAcceptanceStats(challengeId: string): Promise<{
  submissions: number;
  accepted: number;
  acceptancePct: number | null;
  live: boolean;
}> {
  const rows = await prisma.testRun.findMany({
    where: {
      job: {
        type: "hidden_test",
        workspace: { assignment: { assessment: { challengeId } } },
      },
    },
    select: {
      passed: true,
      failed: true,
      hiddenPassed: true,
      hiddenFailed: true,
      results: true,
      job: { select: { status: true } },
    },
    take: 5000,
  });
  if (!rows.length) {
    return { submissions: 0, accepted: 0, acceptancePct: null, live: false };
  }
  let accepted = 0;
  for (const r of rows) {
    const results = r.results as { passed?: number; total?: number } | null;
    const hiddenTotal = r.hiddenPassed + r.hiddenFailed;
    const allPass =
      (hiddenTotal > 0 && r.hiddenFailed === 0) ||
      (r.failed === 0 && r.passed > 0) ||
      (r.job.status === "SUCCEEDED" &&
        results &&
        typeof results.total === "number" &&
        results.total > 0 &&
        results.passed === results.total);
    if (allPass) accepted += 1;
  }
  const submissions = rows.length;
  const acceptancePct = submissions ? Math.round((accepted / submissions) * 1000) / 10 : null;
  return { submissions, accepted, acceptancePct, live: true };
}

export async function relatedCodingProblems(opts: {
  challengeId: string;
  tags: string[];
  track: string;
  take?: number;
}) {
  const take = opts.take ?? 6;
  const related = await prisma.challenge.findMany({
    where: {
      id: { not: opts.challengeId },
      type: "CODING_PROBLEM",
      isPublished: true,
      ...(opts.tags.length
        ? {
            OR: [
              { tags: { hasSome: opts.tags.slice(0, 5) } },
              { track: opts.track as never },
            ],
          }
        : { track: opts.track as never }),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      tags: true,
      isPremium: true,
    },
    orderBy: [{ frequency: "desc" }, { createdAt: "desc" }],
    take: take * 3,
  });
  const scored = related
    .map((c) => {
      const overlap = c.tags.filter((t) => opts.tags.includes(t)).length;
      return { ...c, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap || b.tags.length - a.tags.length);
  return scored.slice(0, take).map(({ overlap: _o, ...c }) => c);
}
