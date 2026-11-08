import { z } from "zod";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canAdmin } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { autoRunAllAssessmentsAndPostScores } from "@/server/assessments/auto-run-all";
import { writeAudit } from "@/server/security/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  aiModelId: z.string().optional(),
  assignmentLimit: z.number().int().min(1).max(500).optional(),
  aiLimit: z.number().int().min(1).max(500).optional(),
});

/** SUPER_ADMIN — run every scoreable assessment path and post scores. */
export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canAdmin(user.role)) {
      throw new AppError("Only admins can auto-run assessments and post scores", 403, "FORBIDDEN");
    }
    const body = schema.parse(await req.json().catch(() => ({})));
    const result = await autoRunAllAssessmentsAndPostScores({
      aiModelId: body.aiModelId,
      assignmentLimit: body.assignmentLimit,
      aiLimit: body.aiLimit,
      actorId: user.id,
    });
    await writeAudit({
      actorId: user.id,
      action: "admin.assessments.auto_run",
      entityType: "ScoreReport",
      metadata: {
        assignmentPosted: result.assignmentScores.posted,
        aiPosted: result.aiSweep.posted,
        aiCleared: result.aiSweep.cleared,
        scoreReports: result.totals.scoreReports,
      },
    });
    return jsonOk(result, { status: 201 });
  });
}
