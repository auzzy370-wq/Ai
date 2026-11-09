import { z } from "zod";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canAdmin } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { autoScoreOneAssignment } from "@/server/assessments/auto-score";
import { writeAudit } from "@/server/security/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  assignmentId: z.string().min(1),
});

/** SUPER_ADMIN — run public + hidden + deploy for one assignment and post ScoreReport. */
export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canAdmin(user.role)) {
      throw new AppError("Only admins can auto-run assessment suites", 403, "FORBIDDEN");
    }
    const body = schema.parse(await req.json());
    const result = await autoScoreOneAssignment(body.assignmentId);
    await writeAudit({
      actorId: user.id,
      action: "admin.assessments.auto_run_one",
      entityType: "AssessmentAssignment",
      entityId: body.assignmentId,
      metadata: {
        overall: result.overall,
        tests: result.tests,
        error: result.error ?? null,
      },
    });
    return jsonOk(result, { status: 201 });
  });
}
