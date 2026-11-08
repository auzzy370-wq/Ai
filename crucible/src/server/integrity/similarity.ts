import { createHash } from "crypto";
import { prisma } from "@/lib/db";

/** Normalize source for coarse similarity (not a plagiarism verdict). */
export function normalizeSolution(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/#.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function solutionFingerprint(src: string): string {
  return createHash("sha256").update(normalizeSolution(src)).digest("hex");
}

/** Jaccard token overlap on normalized tokens — advisory only. */
export function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeSolution(a).split(" ").filter((t) => t.length > 2));
  const tb = new Set(normalizeSolution(b).split(" ").filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

/**
 * Compare candidate solution against recent accepted solutions for the same challenge.
 * Emits IntegrityEvent for human review when overlap is high — never auto-fails.
 */
export async function scanSubmissionSimilarity(opts: {
  userId: string;
  challengeId: string;
  assignmentId: string;
  solutionText: string;
}) {
  const fingerprint = solutionFingerprint(opts.solutionText);
  if (opts.solutionText.trim().length < 40) return { fingerprint, flagged: false };

  const peers = await prisma.workspaceFile.findMany({
    where: {
      path: { in: ["src/solution.ts", "src/solution.py", "src/solution.go", "src/solution.js"] },
      workspace: {
        assignment: {
          candidateId: { not: opts.userId },
          assessment: { challengeId: opts.challengeId },
          status: { in: ["SUBMITTED", "GRADING", "UNDER_REVIEW", "COMPLETED"] },
        },
      },
    },
    select: {
      content: true,
      workspace: { select: { assignment: { select: { candidateId: true } } } },
    },
    take: 40,
    orderBy: { updatedAt: "desc" },
  });

  let maxOverlap = 0;
  let matchedUserId: string | null = null;
  for (const p of peers) {
    const o = tokenOverlap(opts.solutionText, p.content);
    if (o > maxOverlap) {
      maxOverlap = o;
      matchedUserId = p.workspace.assignment.candidateId;
    }
  }

  const flagged = maxOverlap >= 0.82;
  if (flagged) {
    await prisma.integrityEvent.create({
      data: {
        userId: opts.userId,
        challengeId: opts.challengeId,
        assignmentId: opts.assignmentId,
        kind: "similar_submission",
        severity: maxOverlap >= 0.92 ? "high" : "medium",
        score: Math.round(maxOverlap * 1000) / 1000,
        detail: {
          fingerprint,
          maxOverlap,
          peerUserId: matchedUserId,
          note: "Advisory signal only — requires human review. Not an accusation.",
        },
      },
    });
  } else {
    const priors = await prisma.integrityEvent.findMany({
      where: { challengeId: opts.challengeId, kind: "solution_fingerprint" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, userId: true, detail: true },
    });
    const match = priors.find((p) => {
      const d = p.detail as { fingerprint?: string } | null;
      return d?.fingerprint === fingerprint;
    });
    if (match && match.userId !== opts.userId) {
      await prisma.integrityEvent.create({
        data: {
          userId: opts.userId,
          challengeId: opts.challengeId,
          assignmentId: opts.assignmentId,
          kind: "reused_fingerprint",
          severity: "medium",
          score: 1,
          detail: { fingerprint, priorEventId: match.id },
        },
      });
    } else if (!match) {
      await prisma.integrityEvent.create({
        data: {
          userId: opts.userId,
          challengeId: opts.challengeId,
          assignmentId: opts.assignmentId,
          kind: "solution_fingerprint",
          severity: "info",
          score: 0,
          detail: { fingerprint },
        },
      });
    }
  }

  return { fingerprint, flagged, maxOverlap };
}
