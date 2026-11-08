import { z } from "zod";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canAdmin } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { autoScoreAllAssignments } from "@/server/assessments/auto-score";
import { writeAudit } from "@/server/security/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

/** SUPER_ADMIN — run harnesses on all assignments and post ScoreReports. */
export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canAdmin(user.role)) {
      throw new AppError("Only admins can auto-score assignments", 403, "FORBIDDEN");
    }
    const body = schema.parse(await req.json().catch(() => ({})));
    const result = await autoScoreAllAssignments({ limit: body.limit });
    await writeAudit({
      actorId: user.id,
      action: "admin.assignments.auto_score",
      entityType: "ScoreReport",
      metadata: { count: result.results.length, scored: result.results.filter((r) => !r.error).length },
    });
    return jsonOk(result, { status: 201 });
  });
}