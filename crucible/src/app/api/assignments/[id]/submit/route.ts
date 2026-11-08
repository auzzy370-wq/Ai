import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { enqueueExecution } from "@/server/execution/runner";
import { evaluateSubmission } from "@/server/ai/evaluate";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/server/security/audit";

const schema = z.object({ notes: z.string().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const assignment = await prisma.assessmentAssignment.findUnique({
      where: { id },
      include: {
        workspace: { include: { files: { where: { path: { startsWith: "src/solution" } } } } },
        assessment: { select: { challengeId: true } },
      },
    });
    if (!assignment || assignment.candidateId !== user.id) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (!assignment.workspace) throw new AppError("Workspace missing", 400, "NO_WORKSPACE");
    const body = schema.parse(await req.json().catch(() => ({})));

    const submission = await prisma.submission.create({
      data: {
        assignmentId: id,
        commitSha: assignment.workspace.lastCommitSha,
        notes: body.notes,
      },
    });

    await prisma.assessmentAssignment.update({
      where: { id },
      data: { status: "GRADING", submittedAt: new Date() },
    });

    // Advisory integrity scan — never auto-fails the candidate
    let integrity: { fingerprint: string; flagged: boolean; maxOverlap?: number } | null = null;
    try {
      const { scanSubmissionSimilarity } = await import("@/server/integrity/similarity");
      const solutionText = assignment.workspace.files.map((f) => f.content).join("\n");
      if (solutionText.trim()) {
        integrity = await scanSubmissionSimilarity({
          userId: user.id,
          challengeId: assignment.assessment.challengeId,
          assignmentId: id,
          solutionText,
        });
      }
    } catch {
      /* non-blocking */
    }

    await enqueueExecution({ workspaceId: assignment.workspace.id, type: "test" });
    await enqueueExecution({ workspaceId: assignment.workspace.id, type: "hidden_test" });
    await enqueueExecution({ workspaceId: assignment.workspace.id, type: "deploy_check" });

    // Allow jobs to settle briefly in-process, then evaluate
    await new Promise((r) => setTimeout(r, 1500));
    const report = await evaluateSubmission(submission.id);

    await writeAudit({
      actorId: user.id,
      action: "assignment.submit",
      entityType: "Submission",
      entityId: submission.id,
      metadata: integrity ? { integrityFlagged: integrity.flagged } : undefined,
    });

    return jsonOk({ submission, report, integrity });
  });
}
