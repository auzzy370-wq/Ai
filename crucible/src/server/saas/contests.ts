import { prisma } from "@/lib/db";

export async function ensureActiveContest() {
  const now = new Date();
  const existing = await prisma.contest.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
    include: {
      problems: { include: { challenge: true }, orderBy: { ordinal: "asc" } },
      entries: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: [{ score: "desc" }, { penaltyMin: "asc" }],
        take: 50,
      },
    },
  });
  if (existing) return existing;

  const coding = await prisma.challenge.findMany({
    where: { type: "CODING_PROBLEM", isPublished: true, isPremium: false },
    orderBy: { frequency: "desc" },
    take: 3,
  });
  if (coding.length < 2) return null;

  const startsAt = new Date(now);
  startsAt.setUTCHours(0, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);

  return prisma.contest.create({
    data: {
      slug: `weekly-arena-${startsAt.toISOString().slice(0, 10)}`,
      title: "Crucible Arena — Weekly Coding Heat",
      description:
        "Optional habit loop: solve the heat set under a shared clock. Evidence assessments still outrank puzzles — this board is for practice velocity.",
      startsAt,
      endsAt,
      isPremium: false,
      mode: "HUMAN",
      status: "LIVE",
      problems: {
        create: coding.map((c, i) => ({
          challengeId: c.id,
          ordinal: i + 1,
          points: 100 + i * 50,
        })),
      },
    },
    include: {
      problems: { include: { challenge: true }, orderBy: { ordinal: "asc" } },
      entries: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: [{ score: "desc" }, { penaltyMin: "asc" }],
        take: 50,
      },
    },
  });
}

export async function upsertContestScore(params: {
  contestId: string;
  userId: string;
  deltaScore: number;
  penaltyMin?: number;
}) {
  const existing = await prisma.contestEntry.findUnique({
    where: { contestId_userId: { contestId: params.contestId, userId: params.userId } },
  });
  if (!existing) {
    return prisma.contestEntry.create({
      data: {
        contestId: params.contestId,
        userId: params.userId,
        score: params.deltaScore,
        solvedCount: 1,
        penaltyMin: params.penaltyMin ?? 0,
      },
    });
  }
  return prisma.contestEntry.update({
    where: { id: existing.id },
    data: {
      score: existing.score + params.deltaScore,
      solvedCount: existing.solvedCount + 1,
      penaltyMin: existing.penaltyMin + (params.penaltyMin ?? 0),
    },
  });
}
