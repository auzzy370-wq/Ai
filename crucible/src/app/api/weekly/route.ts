import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { ensureWeeklyChallenge, recordWeeklyCompletion } from "@/server/saas/weekly";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const weekly = await ensureWeeklyChallenge();
    const mine = await prisma.weeklyChallengeCompletion.findUnique({
      where: {
        userId_weeklyChallengeId: { userId: user.id, weeklyChallengeId: weekly.id },
      },
    });
    const assessment = await prisma.assessment.findFirst({
      where: { challengeId: weekly.challengeId, status: "PUBLISHED" },
    });
    const assignment = assessment
      ? await prisma.assessmentAssignment.findFirst({
          where: { assessmentId: assessment.id, candidateId: user.id },
          include: { workspace: true },
        })
      : null;
    return jsonOk({
      ...weekly,
      completed: Boolean(mine),
      workspaceId: assignment?.workspace?.id ?? null,
      assessmentId: assessment?.id ?? null,
    });
  });
}

export async function POST() {
  return withHandler(async () => {
    const user = await requireUser();
    const weekly = await ensureWeeklyChallenge();
    await recordWeeklyCompletion(user.id, weekly.id);
    return jsonOk({ ok: true, weeklyChallengeId: weekly.id });
  });
}
