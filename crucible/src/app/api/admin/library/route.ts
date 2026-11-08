import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";

export async function GET(req: Request) {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN"]);
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const published = url.searchParams.get("published");
    const take = Math.min(Number(url.searchParams.get("take") || 60), 200);

    const where = {
      ...(published === "true" ? { isPublished: true } : {}),
      ...(published === "false" ? { isPublished: false } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [challenges, assessments, challengeTotal, publishedCount, premiumCount, assessmentTotal, teams, incidents] =
      await Promise.all([
        prisma.challenge.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }],
          take,
          select: {
            id: true,
            slug: true,
            title: true,
            type: true,
            track: true,
            difficulty: true,
            calibratedDifficulty: true,
            integrityStatus: true,
            integrityScannedAt: true,
            contentVersion: true,
            isPublished: true,
            isPremium: true,
            frequency: true,
            avgMinutes: true,
            tags: true,
            _count: { select: { assessments: true } },
          },
        }),
        prisma.assessment.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            status: true,
            track: true,
            timedMinutes: true,
            createdAt: true,
            challenge: { select: { slug: true, title: true, type: true } },
            _count: { select: { assignments: true } },
          },
        }),
        prisma.challenge.count(),
        prisma.challenge.count({ where: { isPublished: true } }),
        prisma.challenge.count({ where: { isPremium: true } }),
        prisma.assessment.count(),
        prisma.engineeringTeam.count(),
        prisma.incidentScenario.count(),
      ]);

    return jsonOk({
      challenges,
      assessments,
      counts: {
        challenges: challengeTotal,
        published: publishedCount,
        premium: premiumCount,
        assessments: assessmentTotal,
        teams,
        incidents,
      },
    });
  });
}

const patchSchema = z.object({
  challengeId: z.string(),
  isPublished: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  difficulty: z.number().int().min(1).max(10).optional(),
  /** Skip integrity gate when publishing (logged). */
  force: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  return withHandler(async () => {
    const admin = await requireUser(["SUPER_ADMIN"]);
    const body = patchSchema.parse(await req.json());

    // Publish only after Challenge Integrity Engine passes (unless force).
    if (body.isPublished === true) {
      const { assertPublishable } = await import("@/server/integrity/challenge-engine");
      const gate = await assertPublishable(body.challengeId, { force: body.force });
      if (!gate.allowed) {
        const { AppError } = await import("@/lib/errors");
        throw new AppError(
          `Publish blocked by Challenge Integrity Engine (${gate.result.findings.filter((f) => f.severity === "error").length} errors). Scan results saved — fix or force.`,
          409,
          "INTEGRITY_BLOCK",
        );
      }
    }

    const updated = await prisma.challenge.update({
      where: { id: body.challengeId },
      data: {
        ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
        ...(body.isPremium !== undefined ? { isPremium: body.isPremium } : {}),
        ...(body.difficulty !== undefined ? { difficulty: body.difficulty } : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        isPublished: true,
        isPremium: true,
        difficulty: true,
        integrityStatus: true,
        calibratedDifficulty: true,
        contentVersion: true,
      },
    });
    await writeAudit({
      action: "admin.challenge_update",
      entityType: "Challenge",
      entityId: updated.id,
      actorId: admin.id,
      metadata: {
        isPublished: body.isPublished,
        isPremium: body.isPremium,
        difficulty: body.difficulty,
        force: body.force,
      },
    });
    return jsonOk(updated);
  });
}
