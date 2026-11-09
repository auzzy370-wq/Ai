import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canManageCandidates } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";

export async function GET() {
  return withHandler(async () => {
    await requireUser();
    const now = new Date();
    const contests = await prisma.contest.findMany({
      orderBy: { startsAt: "desc" },
      take: 30,
      include: {
        problems: {
          orderBy: { ordinal: "asc" },
          include: { challenge: { select: { id: true, slug: true, title: true, difficulty: true, researchFrontier: true } } },
        },
        entries: {
          orderBy: [{ score: "desc" }, { penaltyMin: "asc" }],
          take: 10,
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { entries: true } },
      },
    });

    return jsonOk({
      tournaments: contests.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        mode: c.mode,
        status:
          c.status === "CANCELLED"
            ? "CANCELLED"
            : now < c.startsAt
              ? "SCHEDULED"
              : now > c.endsAt
                ? "COMPLETED"
                : "LIVE",
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        isPremium: c.isPremium,
        problemCount: c.problems.length,
        entryCount: c._count.entries,
        problems: c.problems.map((p) => ({
          ordinal: p.ordinal,
          points: p.points,
          challenge: p.challenge,
        })),
        standings: c.entries.map((e, i) => ({
          rank: i + 1,
          userId: e.userId,
          name: e.user.name,
          score: e.score,
          solvedCount: e.solvedCount,
          penaltyMin: e.penaltyMin,
        })),
      })),
    });
  });
}

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(4000),
  mode: z.enum(["HUMAN", "AI", "HYBRID", "TEAM"]).default("HUMAN"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  challengeIds: z.array(z.string()).min(1).max(20),
  isPremium: z.boolean().optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canManageCandidates(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const body = createSchema.parse(await req.json());
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (endsAt <= startsAt) throw new AppError("endsAt must be after startsAt", 400, "BAD_REQUEST");

    const slug = `tour-${body.mode.toLowerCase()}-${Date.now().toString(36)}`;
    const contest = await prisma.contest.create({
      data: {
        slug,
        title: body.title,
        description: body.description,
        mode: body.mode,
        status: "SCHEDULED",
        startsAt,
        endsAt,
        isPremium: body.isPremium ?? false,
        problems: {
          create: body.challengeIds.map((challengeId, i) => ({
            challengeId,
            ordinal: i + 1,
            points: 100 + i * 50,
          })),
        },
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "competition.tournament_create",
      entityType: "Contest",
      entityId: contest.id,
      metadata: { mode: body.mode, challenges: body.challengeIds.length },
    });
    return jsonOk({ id: contest.id, slug: contest.slug }, { status: 201 });
  });
}

const registerSchema = z.object({
  contestId: z.string(),
});

export async function PUT(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = registerSchema.parse(await req.json());
    const contest = await prisma.contest.findUnique({ where: { id: body.contestId } });
    if (!contest) throw new AppError("Not found", 404, "NOT_FOUND");
    if (contest.mode === "AI") throw new AppError("AI-only tournament — register models via benchmark API", 400, "AI_ONLY");
    const entry = await prisma.contestEntry.upsert({
      where: { contestId_userId: { contestId: contest.id, userId: user.id } },
      create: { contestId: contest.id, userId: user.id },
      update: {},
    });
    return jsonOk({ registered: true, entryId: entry.id });
  });
}
