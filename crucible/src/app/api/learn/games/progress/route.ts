import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import {
  ARCADE_GAMES,
  ARCADE_PLAN_SLUG,
  ARCADE_TARGET_COUNT,
  arcadeClearXp,
  arcadeReplayPerfectXp,
  getArcadeGame,
} from "@/server/learning/arcade-games";
import { touchLearnStreak } from "@/server/learning/gamification";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const enrollment = await prisma.studyPlanEnrollment.findUnique({
      where: { userId_planSlug: { userId: user.id, planSlug: ARCADE_PLAN_SLUG } },
    });
    const done = new Set(enrollment?.completedSlugs ?? []);
    const completedCount = ARCADE_GAMES.reduce((n, g) => n + (done.has(g.slug) ? 1 : 0), 0);
    return jsonOk({
      enrolled: Boolean(enrollment),
      completedSlugs: enrollment?.completedSlugs ?? [],
      completedCount,
      totalCount: ARCADE_TARGET_COUNT,
      percent: Math.round((completedCount / ARCADE_TARGET_COUNT) * 100),
    });
  });
}

const postSchema = z.object({
  gameSlug: z.string().min(2),
  perfect: z.boolean().optional().default(false),
  score: z.number().int().min(0).max(10_000).optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = postSchema.parse(await req.json());
    const game = getArcadeGame(body.gameSlug);
    if (!game) throw new AppError("Game not found", 404, "NOT_FOUND");

    let enrollment = await prisma.studyPlanEnrollment.findUnique({
      where: { userId_planSlug: { userId: user.id, planSlug: ARCADE_PLAN_SLUG } },
    });
    if (!enrollment) {
      enrollment = await prisma.studyPlanEnrollment.create({
        data: { userId: user.id, planSlug: ARCADE_PLAN_SLUG },
      });
    }

    const set = new Set(enrollment.completedSlugs);
    const firstClear = !set.has(body.gameSlug);
    set.add(body.gameSlug);

    await prisma.studyPlanEnrollment.update({
      where: { id: enrollment.id },
      data: { completedSlugs: [...set] },
    });

    let xpEarned = 0;
    if (firstClear) {
      xpEarned = arcadeClearXp(Boolean(body.perfect));
      await touchLearnStreak(user.id);
    } else if (body.perfect) {
      xpEarned = arcadeReplayPerfectXp();
      await touchLearnStreak(user.id);
    } else {
      await touchLearnStreak(user.id);
    }

    const completedCount = ARCADE_GAMES.reduce((n, g) => n + (set.has(g.slug) ? 1 : 0), 0);

    return jsonOk({
      gameSlug: body.gameSlug,
      firstClear,
      xpEarned,
      completedCount,
      totalCount: ARCADE_TARGET_COUNT,
      score: body.score ?? null,
    });
  });
}
