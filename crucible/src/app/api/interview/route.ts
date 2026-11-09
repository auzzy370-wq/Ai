import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { isPremium, requireUser } from "@/server/auth/session";
import { createWorkspaceForAssignment } from "@/server/execution/workspace";
import {
  FREE_MOCK_LIMIT,
  getInterviewRound,
  type InterviewRoundKind,
} from "@/server/saas/interview-rounds";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const sims = await prisma.interviewSimulation.findMany({
      where: { userId: user.id },
      include: { challenge: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const totalUsed = await prisma.interviewSimulation.count({ where: { userId: user.id } });
    const premium = isPremium(user);
    return jsonOk({
      sims,
      premium,
      freeRemaining: premium ? 999 : Math.max(0, FREE_MOCK_LIMIT - totalUsed),
      freeLimit: FREE_MOCK_LIMIT,
    });
  });
}

const startSchema = z.object({
  company: z.string().min(2),
  role: z.string().min(2).default("Software Engineer"),
  challengeId: z.string().optional(),
  roundKind: z.enum(["phone", "coding", "onsite"]).default("coding"),
});

function difficultyFilter(bias: "easy" | "mixed" | "hard") {
  if (bias === "easy") return { lte: 4 };
  if (bias === "hard") return { gte: 6 };
  return { gte: 3, lte: 8 };
}

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const premium = isPremium(user);
    const totalUsed = await prisma.interviewSimulation.count({ where: { userId: user.id } });
    if (!premium && totalUsed >= FREE_MOCK_LIMIT) {
      throw new AppError(
        "Free mock interview used. Upgrade to Premium for unlimited company rounds.",
        402,
        "PREMIUM_REQUIRED",
      );
    }

    const body = startSchema.parse(await req.json());
    const round = getInterviewRound(body.roundKind);
    const diff = difficultyFilter(round.difficultyBias);

    let challenge = body.challengeId
      ? await prisma.challenge.findUnique({ where: { id: body.challengeId } })
      : null;

    if (!challenge) {
      const pool = await prisma.challenge.findMany({
        where: {
          isPublished: true,
          type: "CODING_PROBLEM",
          companies: { has: body.company },
          difficulty: diff,
        },
        orderBy: { frequency: "desc" },
        take: 20,
      });
      if (!pool.length) {
        const fallbackPool = await prisma.challenge.findMany({
          where: {
            isPublished: true,
            type: "CODING_PROBLEM",
            companies: { has: body.company },
          },
          orderBy: { frequency: "desc" },
          take: 20,
        });
        challenge = fallbackPool[Math.floor(Math.random() * Math.max(fallbackPool.length, 1))] ?? null;
      } else {
        challenge = pool[Math.floor(Math.random() * pool.length)] ?? null;
      }
    }

    if (!challenge) {
      challenge = await prisma.challenge.findFirst({
        where: { isPublished: true, type: "CODING_PROBLEM", difficulty: diff },
        orderBy: { frequency: "desc" },
      });
    }
    if (!challenge) {
      challenge = await prisma.challenge.findFirst({
        where: { isPublished: true, type: "CODING_PROBLEM" },
        orderBy: { frequency: "desc" },
      });
    }
    if (!challenge) throw new AppError("No coding challenges available", 404, "NOT_FOUND");

    const timedMinutes = round.minutes || challenge.avgMinutes || 45;
    const sim = await prisma.interviewSimulation.create({
      data: {
        userId: user.id,
        company: body.company,
        role: body.role,
        challengeId: challenge.id,
        timedMinutes,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
      include: { challenge: true },
    });

    let assessment = await prisma.assessment.findFirst({
      where: { challengeId: challenge.id, status: "PUBLISHED" },
    });
    if (!assessment) {
      assessment = await prisma.assessment.create({
        data: {
          title: `${body.company} ${round.title} — ${challenge.title}`,
          description: `Timed ${round.title} simulation for ${body.role}`,
          challengeId: challenge.id,
          track: challenge.track,
          status: "PUBLISHED",
          timedMinutes,
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
          dueAt: new Date(startedAt.getTime() + timedMinutes * 60 * 1000),
        },
        include: { workspace: true },
      });
      await createWorkspaceForAssignment({
        assignmentId: assignment.id,
        challengeSlug: challenge.slug,
        language: challenge.languages[0] ?? "typescript",
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
        language: challenge.languages[0] ?? "typescript",
        track: challenge.track,
      });
      assignment = await prisma.assessmentAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
        include: { workspace: true },
      });
    }

    return jsonOk(
      {
        simulation: sim,
        workspaceId: assignment.workspace?.id,
        timedMinutes,
        roundKind: round.id as InterviewRoundKind,
        xp: round.xp,
      },
      { status: 201 },
    );
  });
}
