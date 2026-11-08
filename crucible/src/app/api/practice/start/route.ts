import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { CODING_LANGUAGES, normalizeCodingLanguage } from "@/lib/coding-languages";
import {
  createWorkspaceForAssignment,
  repairCodingHarness,
  switchWorkspaceLanguage,
} from "@/server/execution/workspace";

const schema = z.object({
  challengeId: z.string().optional(),
  challengeSlug: z.string().optional(),
  language: z.string().default("typescript"),
});

/** Candidate self-serve: open a coding problem in the chosen language. */
export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    const language = normalizeCodingLanguage(body.language);
    if (!(CODING_LANGUAGES as readonly string[]).includes(language)) {
      throw new AppError("Unsupported language", 400, "BAD_LANGUAGE");
    }

    const challenge = body.challengeId
      ? await prisma.challenge.findUnique({ where: { id: body.challengeId } })
      : body.challengeSlug
        ? await prisma.challenge.findUnique({ where: { slug: body.challengeSlug } })
        : null;
    if (!challenge || !challenge.isPublished) {
      throw new AppError("Challenge not found", 404, "NOT_FOUND");
    }

    let assessment = await prisma.assessment.findFirst({
      where: { challengeId: challenge.id, status: "PUBLISHED" },
    });
    if (!assessment) {
      assessment = await prisma.assessment.create({
        data: {
          title: challenge.title,
          description: challenge.summary,
          challengeId: challenge.id,
          track: challenge.track,
          status: "PUBLISHED",
          timedMinutes: challenge.avgMinutes || 45,
          multiDay: false,
          createdById: user.id,
        },
      });
    }

    const minutes = challenge.avgMinutes || 45;
    const dueAt = new Date(Date.now() + minutes * 60 * 1000);

    // One assignment per (assessment, candidate) — reuse and switch language when needed.
    const existing = await prisma.assessmentAssignment.findUnique({
      where: {
        assessmentId_candidateId: {
          assessmentId: assessment.id,
          candidateId: user.id,
        },
      },
      include: { workspace: true },
    });

    if (existing) {
      await prisma.assessmentAssignment.update({
        where: { id: existing.id },
        data: {
          status: ["COMPLETED", "FAILED", "EXPIRED"].includes(existing.status)
            ? "IN_PROGRESS"
            : existing.status === "ASSIGNED"
              ? "IN_PROGRESS"
              : existing.status,
          startedAt: existing.startedAt ?? new Date(),
          dueAt,
        },
      });

      if (existing.workspace) {
        if (challenge.type === "CODING_PROBLEM") {
          if (existing.workspace.language !== language) {
            await switchWorkspaceLanguage({
              workspaceId: existing.workspace.id,
              challengeSlug: challenge.slug,
              language,
              track: challenge.track,
            });
          } else {
            await repairCodingHarness({
              workspaceId: existing.workspace.id,
              challengeSlug: challenge.slug,
              language,
              track: challenge.track,
            });
          }
        }
        return jsonOk({
          assignmentId: existing.id,
          workspaceId: existing.workspace.id,
          language,
        });
      }

      const workspace = await createWorkspaceForAssignment({
        assignmentId: existing.id,
        challengeSlug: challenge.slug,
        language,
        track: challenge.track,
      });
      return jsonOk(
        {
          assignmentId: existing.id,
          workspaceId: workspace.id,
          language,
        },
        { status: 201 },
      );
    }

    const startedAt = new Date();
    const assignment = await prisma.assessmentAssignment.create({
      data: {
        assessmentId: assessment.id,
        candidateId: user.id,
        assignedById: user.id,
        status: "IN_PROGRESS",
        startedAt,
        dueAt,
      },
    });

    const workspace = await createWorkspaceForAssignment({
      assignmentId: assignment.id,
      challengeSlug: challenge.slug,
      language,
      track: challenge.track,
    });

    return jsonOk(
      {
        assignmentId: assignment.id,
        workspaceId: workspace.id,
        language,
      },
      { status: 201 },
    );
  });
}
