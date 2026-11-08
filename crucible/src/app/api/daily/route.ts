import { prisma } from "@/lib/db";
import { normalizeCodingLanguage } from "@/lib/coding-languages";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { createWorkspaceForAssignment } from "@/server/execution/workspace";
import { dateKey, ensureDailyChallenge, recordDailyCompletion } from "@/server/saas/daily";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const daily = await ensureDailyChallenge();
    const completion = await prisma.dailyChallengeCompletion.findUnique({
      where: {
        userId_dailyChallengeId: { userId: user.id, dailyChallengeId: daily.id },
      },
    });
    const streak = await prisma.userStreak.findUnique({ where: { userId: user.id } });
    return jsonOk({
      dateKey: daily.dateKey,
      completed: Boolean(completion),
      streak: streak ?? { currentStreak: 0, longestStreak: 0, lastDateKey: null },
      challenge: {
        id: daily.challenge.id,
        slug: daily.challenge.slug,
        title: daily.challenge.title,
        summary: daily.challenge.summary,
        difficulty: daily.challenge.difficulty,
        tags: daily.challenge.tags,
        avgMinutes: daily.challenge.avgMinutes,
        companies: daily.challenge.companies,
      },
    });
  });
}

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    let language = "typescript";
    try {
      const body = (await req.json()) as { language?: string };
      if (body?.language) language = normalizeCodingLanguage(body.language);
    } catch {
      /* empty body ok */
    }
    const daily = await ensureDailyChallenge();
    const challenge = daily.challenge;

    let assessment = await prisma.assessment.findFirst({
      where: { challengeId: challenge.id, status: "PUBLISHED" },
    });
    if (!assessment) {
      assessment = await prisma.assessment.create({
        data: {
          title: `Daily · ${challenge.title}`,
          description: `Daily challenge for ${daily.dateKey}`,
          challengeId: challenge.id,
          track: challenge.track,
          status: "PUBLISHED",
          timedMinutes: challenge.avgMinutes || 30,
          multiDay: false,
          createdById: user.id,
        },
      });
    }

    let assignment = await prisma.assessmentAssignment.findFirst({
      where: { assessmentId: assessment.id, candidateId: user.id },
      include: { workspace: true },
    });
    if (!assignment) {
      const startedAt = new Date();
      assignment = await prisma.assessmentAssignment.create({
        data: {
          assessmentId: assessment.id,
          candidateId: user.id,
          assignedById: user.id,
          status: "IN_PROGRESS",
          startedAt,
          dueAt: new Date(startedAt.getTime() + (challenge.avgMinutes || 30) * 60 * 1000),
        },
        include: { workspace: true },
      });
      await createWorkspaceForAssignment({
        assignmentId: assignment.id,
        challengeSlug: challenge.slug,
        language,
        track: challenge.track,
      });
      assignment = await prisma.assessmentAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
        include: { workspace: true },
      });
    } else if (!assignment.workspace) {
      await createWorkspaceForAssignment({
        assignmentId: assignment.id,
        challengeSlug: challenge.slug,
        language,
        track: challenge.track,
      });
      assignment = await prisma.assessmentAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
        include: { workspace: true },
      });
    }

    // Completing daily is optimistic when they open it; also callable after submit
    const streak = await recordDailyCompletion(user.id, daily.id, dateKey());

    return jsonOk({
      workspaceId: assignment.workspace?.id,
      streak,
      dateKey: daily.dateKey,
    });
  });
}
