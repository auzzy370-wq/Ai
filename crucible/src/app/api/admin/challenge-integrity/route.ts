import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";
import {
  assertPublishable,
  scanChallengeIntegrity,
  scanChallengeLibrary,
} from "@/server/integrity/challenge-engine";

export async function GET(req: Request) {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN", "HIRING_MANAGER"]);
    const url = new URL(req.url);
    const challengeId = url.searchParams.get("challengeId");
    const slug = url.searchParams.get("slug");

    if (challengeId || slug) {
      const challenge = challengeId
        ? await prisma.challenge.findUnique({ where: { id: challengeId } })
        : await prisma.challenge.findUnique({ where: { slug: slug! } });
      if (!challenge) throw new AppError("Challenge not found", 404, "NOT_FOUND");
      const latest = await prisma.challengeIntegrityReport.findFirst({
        where: { challengeId: challenge.id },
        orderBy: { scannedAt: "desc" },
      });
      return jsonOk({
        challenge: {
          id: challenge.id,
          slug: challenge.slug,
          title: challenge.title,
          difficulty: challenge.difficulty,
          calibratedDifficulty: challenge.calibratedDifficulty,
          integrityStatus: challenge.integrityStatus,
          integrityScannedAt: challenge.integrityScannedAt?.toISOString() ?? null,
          contentVersion: challenge.contentVersion,
          isPublished: challenge.isPublished,
        },
        latest,
      });
    }

    const [counts, recent, worst] = await Promise.all([
      prisma.challenge.groupBy({
        by: ["integrityStatus"],
        _count: { _all: true },
      }),
      prisma.challengeIntegrityReport.findMany({
        orderBy: { scannedAt: "desc" },
        take: 30,
        include: { challenge: { select: { slug: true, title: true, isPublished: true } } },
      }),
      prisma.challenge.findMany({
        where: { integrityStatus: { in: ["fail", "warn"] } },
        orderBy: { integrityScannedAt: "desc" },
        take: 40,
        select: {
          id: true,
          slug: true,
          title: true,
          type: true,
          difficulty: true,
          calibratedDifficulty: true,
          integrityStatus: true,
          isPublished: true,
          integrityScannedAt: true,
        },
      }),
    ]);

    return jsonOk({
      counts: Object.fromEntries(counts.map((c) => [c.integrityStatus, c._count._all])),
      recent: recent.map((r) => ({
        id: r.id,
        status: r.status,
        errorCount: r.errorCount,
        warningCount: r.warningCount,
        scannedAt: r.scannedAt.toISOString(),
        challenge: r.challenge,
        calibratedDifficulty: r.calibratedDifficulty,
        liveAcceptancePct: r.liveAcceptancePct,
      })),
      worst,
    });
  });
}

const postSchema = z.object({
  action: z.enum(["scan", "scan_library", "publish"]),
  challengeId: z.string().optional(),
  slug: z.string().optional(),
  take: z.number().int().min(1).max(500).optional(),
  all: z.boolean().optional(),
  onlyPublished: z.boolean().optional(),
  force: z.boolean().optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const admin = await requireUser(["SUPER_ADMIN"]);
    const body = postSchema.parse(await req.json());

    if (body.action === "scan_library") {
      const out = await scanChallengeLibrary({
        take: body.take ?? 100,
        all: body.all,
        onlyPublished: body.onlyPublished,
        persist: true,
      });
      await writeAudit({
        actorId: admin.id,
        action: "admin.challenge_integrity_scan_library",
        entityType: "Challenge",
        metadata: out.summary,
      });
      return jsonOk(out);
    }

    const challenge = body.challengeId
      ? await prisma.challenge.findUnique({ where: { id: body.challengeId } })
      : body.slug
        ? await prisma.challenge.findUnique({ where: { slug: body.slug } })
        : null;
    if (!challenge) throw new AppError("challengeId or slug required", 400, "BAD_REQUEST");

    if (body.action === "scan") {
      const result = await scanChallengeIntegrity(challenge.id, { persist: true });
      await writeAudit({
        actorId: admin.id,
        action: "admin.challenge_integrity_scan",
        entityType: "Challenge",
        entityId: challenge.id,
        metadata: { status: result.status, errors: result.findings.filter((f) => f.severity === "error").length },
      });
      return jsonOk(result);
    }

    // publish — integrity gate
    const gate = await assertPublishable(challenge.id, { force: body.force });
    if (!gate.allowed) {
      throw new AppError(
        `Publish blocked: integrity ${gate.result.status} (${gate.result.findings.filter((f) => f.severity === "error").length} errors). Fix findings or pass force=true.`,
        409,
        "INTEGRITY_BLOCK",
      );
    }
    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: { isPublished: true },
      select: {
        id: true,
        slug: true,
        isPublished: true,
        integrityStatus: true,
        contentVersion: true,
        calibratedDifficulty: true,
      },
    });
    await writeAudit({
      actorId: admin.id,
      action: "admin.challenge_publish_gated",
      entityType: "Challenge",
      entityId: challenge.id,
      metadata: { forced: gate.forced, status: gate.result.status },
    });
    return jsonOk({ challenge: updated, integrity: gate.result, forced: gate.forced });
  });
}
