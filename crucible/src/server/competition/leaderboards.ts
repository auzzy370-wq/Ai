import { prisma } from "@/lib/db";

export type HumanStanding = {
  rank: number;
  userId: string;
  name: string;
  publicSlug: string | null;
  contestScore: number;
  solvedCount: number;
  penaltyMin: number;
  completions: number;
  contest: string | null;
  verified: boolean;
  scoring: string;
  onDisplayedBoard: boolean;
  metric: "contest" | "completions";
};

/** Transparent human leaderboard from contest entries + assignment completions. */
export async function humanLeaderboard(opts?: { windowDays?: number; take?: number }) {
  const take = opts?.take ?? 50;
  const since =
    opts?.windowDays != null ? new Date(Date.now() - opts.windowDays * 86400000) : null;

  const entries = await prisma.contestEntry.findMany({
    where: since ? { updatedAt: { gte: since } } : undefined,
    orderBy: [{ score: "desc" }, { penaltyMin: "asc" }],
    take,
    include: {
      user: { select: { id: true, name: true, candidateProfile: { select: { publicSlug: true } } } },
      contest: { select: { slug: true, title: true, mode: true } },
    },
  });

  const completions = await prisma.assessmentAssignment.groupBy({
    by: ["candidateId"],
    where: {
      status: { in: ["COMPLETED", "UNDER_REVIEW"] },
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    _count: { _all: true },
  });
  const completionMap = Object.fromEntries(completions.map((c) => [c.candidateId, c._count._all]));

  return entries.map((e, i) => ({
    rank: i + 1,
    userId: e.userId,
    name: e.user.name,
    publicSlug: e.user.candidateProfile?.publicSlug ?? null,
    contestScore: e.score,
    solvedCount: e.solvedCount,
    penaltyMin: e.penaltyMin,
    completions: completionMap[e.userId] ?? 0,
    contest: e.contest.slug,
    verified: true,
    scoring: "contest_score_desc_then_penalty_asc",
  }));
}

/**
 * Private standing for the signed-in viewer — always returned to them even when
 * they fall outside the displayed top-N board.
 */
export async function humanViewerStanding(
  userId: string,
  opts?: { windowDays?: number; boardTake?: number },
): Promise<HumanStanding | null> {
  const boardTake = opts?.boardTake ?? 50;
  const since =
    opts?.windowDays != null ? new Date(Date.now() - opts.windowDays * 86400000) : null;

  const myEntry = await prisma.contestEntry.findFirst({
    where: {
      userId,
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    orderBy: [{ score: "desc" }, { penaltyMin: "asc" }],
    include: {
      user: { select: { id: true, name: true, candidateProfile: { select: { publicSlug: true } } } },
      contest: { select: { slug: true } },
    },
  });

  const myCompletions = await prisma.assessmentAssignment.count({
    where: {
      candidateId: userId,
      status: { in: ["COMPLETED", "UNDER_REVIEW"] },
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
  });

  if (myEntry) {
    const ahead = await prisma.contestEntry.count({
      where: {
        ...(since ? { updatedAt: { gte: since } } : {}),
        OR: [
          { score: { gt: myEntry.score } },
          { score: myEntry.score, penaltyMin: { lt: myEntry.penaltyMin } },
          {
            score: myEntry.score,
            penaltyMin: myEntry.penaltyMin,
            id: { lt: myEntry.id },
          },
        ],
      },
    });
    const rank = ahead + 1;
    return {
      rank,
      userId,
      name: myEntry.user.name,
      publicSlug: myEntry.user.candidateProfile?.publicSlug ?? null,
      contestScore: myEntry.score,
      solvedCount: myEntry.solvedCount,
      penaltyMin: myEntry.penaltyMin,
      completions: myCompletions,
      contest: myEntry.contest.slug,
      verified: true,
      scoring: "contest_score_desc_then_penalty_asc",
      onDisplayedBoard: rank <= boardTake,
      metric: "contest",
    };
  }

  // No contest entry yet — still show a private completions rank so the board isn't a blank wall.
  if (myCompletions <= 0) {
    return {
      rank: 0,
      userId,
      name: (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? "You",
      publicSlug: null,
      contestScore: 0,
      solvedCount: 0,
      penaltyMin: 0,
      completions: 0,
      contest: null,
      verified: false,
      scoring: "unranked_until_contest_or_clear",
      onDisplayedBoard: false,
      metric: "completions",
    };
  }

  const completionGroups = await prisma.assessmentAssignment.groupBy({
    by: ["candidateId"],
    where: {
      status: { in: ["COMPLETED", "UNDER_REVIEW"] },
      ...(since ? { updatedAt: { gte: since } } : {}),
    },
    _count: { _all: true },
  });
  const aheadCompletions = completionGroups.filter((g) => g._count._all > myCompletions).length;
  const tiedEarlier = completionGroups
    .filter((g) => g._count._all === myCompletions && g.candidateId < userId)
    .length;
  const rank = aheadCompletions + tiedEarlier + 1;
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, candidateProfile: { select: { publicSlug: true } } },
  });

  return {
    rank,
    userId,
    name: me?.name ?? "You",
    publicSlug: me?.candidateProfile?.publicSlug ?? null,
    contestScore: 0,
    solvedCount: 0,
    penaltyMin: 0,
    completions: myCompletions,
    contest: null,
    verified: true,
    scoring: "completions_desc_until_contest_entry",
    onDisplayedBoard: false,
    metric: "completions",
  };
}

export type TeamStanding = {
  rank: number;
  teamId: string;
  name: string;
  memberCount: number;
  assessmentTitle: string;
  overall: number;
  qualified: boolean;
  verified: boolean;
  scoring: string;
  onDisplayedBoard: boolean;
};

export async function teamViewerStanding(
  userId: string,
  opts?: { boardTake?: number },
): Promise<TeamStanding | null> {
  const boardTake = opts?.boardTake ?? 50;
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    select: { teamId: true },
    orderBy: { joinedAt: "desc" },
  });
  if (!membership) return null;

  const full = await teamLeaderboard({ take: 500 });
  const mine = full.find((r) => r.teamId === membership.teamId);
  if (!mine) return null;
  return {
    ...mine,
    onDisplayedBoard: mine.rank <= boardTake,
  };
}

export async function aiLeaderboard(opts?: { take?: number }) {
  const take = opts?.take ?? 50;
  const runs = await prisma.aiBenchmarkRun.groupBy({
    by: ["aiModelId"],
    _count: { _all: true },
  });

  const models = await prisma.aiModel.findMany({
    where: { id: { in: runs.map((r) => r.aiModelId) } },
  });
  const modelMap = Object.fromEntries(models.map((m) => [m.id, m]));

  const rows = [];
  for (const r of runs) {
    const all = await prisma.aiBenchmarkRun.findMany({
      where: { aiModelId: r.aiModelId, status: "COMPLETED" },
      select: {
        correct: true,
        latencyMs: true,
        resultClass: true,
        mocked: true,
        passedPublic: true,
        totalPublic: true,
        passedHidden: true,
        totalHidden: true,
        challenge: { select: { difficulty: true, slug: true } },
      },
    });
    const verified = all.filter((a) => a.resultClass === "verified" && !a.mocked);
    const pool = verified.length ? verified : all;
    const latestByChallenge = new Map<string, (typeof pool)[number]>();
    for (const a of pool) {
      const key = a.challenge.slug;
      const prev = latestByChallenge.get(key);
      if (!prev || runPartial(a) > runPartial(prev) || (a.correct && !prev.correct)) {
        latestByChallenge.set(key, a);
      }
    }
    const distinct = [...latestByChallenge.values()];
    const correct = distinct.filter((a) => a.correct).length;
    const latencySamples = distinct.filter((a) => a.latencyMs != null);
    const avgLatency = latencySamples.length
      ? latencySamples.reduce((s, a) => s + (a.latencyMs ?? 0), 0) / latencySamples.length
      : null;

    let weightSum = 0;
    let pointSum = 0;
    for (const a of distinct) {
      const difficulty = Math.max(1, Math.min(10, a.challenge.difficulty || 1));
      const partial = runPartial(a);
      weightSum += difficulty;
      pointSum += difficulty * partial;
    }
    const scorePct = weightSum ? Math.round((pointSum / weightSum) * 1000) / 10 : 0;

    const m = modelMap[r.aiModelId];
    if (!m || !distinct.length) continue;
    rows.push({
      modelId: m.id,
      slug: m.slug,
      displayName: m.displayName,
      provider: m.provider,
      attempts: distinct.length,
      correct,
      accuracyPct: scorePct,
      clearRatePct: distinct.length ? Math.round((correct / distinct.length) * 1000) / 10 : 0,
      avgLatencyMs: avgLatency ? Math.round(avgLatency) : null,
      verifiedPool: verified.length > 0,
      note: verified.length
        ? "Difficulty-weighted partial credit on verified API-backed runs (one row per challenge)"
        : "Experimental / mocked runs — not claimed as model capability limits",
    });
  }

  rows.sort(
    (a, b) =>
      b.accuracyPct - a.accuracyPct ||
      b.correct - a.correct ||
      (a.avgLatencyMs ?? 9e9) - (b.avgLatencyMs ?? 9e9),
  );
  return rows.slice(0, take).map((r, i) => ({ rank: i + 1, ...r }));
}

function runPartial(a: {
  correct: boolean;
  passedPublic: number;
  totalPublic: number;
  passedHidden: number;
  totalHidden: number;
}): number {
  if (a.correct) return 1;
  const pub = a.totalPublic > 0 ? a.passedPublic / a.totalPublic : 0;
  const hid = a.totalHidden > 0 ? a.passedHidden / a.totalHidden : 0;
  if (a.totalPublic === 0 && a.totalHidden === 0) return 0;
  if (a.totalHidden === 0) return pub * 0.85;
  if (a.totalPublic === 0) return hid * 0.9;
  return pub * 0.4 + hid * 0.6;
}

export async function teamLeaderboard(opts?: { take?: number }) {
  const take = opts?.take ?? 50;
  const teams = await prisma.engineeringTeam.findMany({
    take: Math.max(take * 2, 100),
    orderBy: { createdAt: "desc" },
    include: {
      members: { select: { userId: true } },
      assessment: {
        select: {
          title: true,
          assignments: {
            take: 5,
            orderBy: { updatedAt: "desc" },
            select: {
              status: true,
              scoreReport: { select: { overall: true, qualified: true } },
            },
          },
        },
      },
    },
  });

  return teams
    .map((t) => {
      const reports = t.assessment.assignments
        .map((a) => a.scoreReport)
        .filter(Boolean) as { overall: number; qualified: boolean }[];
      const overall = reports.length
        ? reports.reduce((s, r) => s + r.overall, 0) / reports.length
        : 0;
      return {
        teamId: t.id,
        name: t.name,
        memberCount: t.members.length,
        assessmentTitle: t.assessment.title,
        overall: Math.round(overall * 10) / 10,
        qualified: reports.some((r) => r.qualified),
        verified: reports.length > 0,
        scoring: "avg_team_assessment_score_report",
      };
    })
    .sort((a, b) => b.overall - a.overall)
    .slice(0, take)
    .map((r, i) => ({ rank: i + 1, ...r }));
}
