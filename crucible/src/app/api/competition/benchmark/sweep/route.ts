import { z } from "zod";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canAdmin } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { sweepAiAcrossAssessments } from "@/server/competition/ai-sweep";
import { writeAudit } from "@/server/security/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  aiModelId: z.string().optional(),
  limit: z.number().int().min(1).max(80).optional(),
});

/** SUPER_ADMIN only — auto-run AI through assessments and post leaderboard scores. */
export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canAdmin(user.role)) {
      throw new AppError("Only admins can auto-run assessment sweeps", 403, "FORBIDDEN");
    }
    const body = schema.parse(await req.json().catch(() => ({})));
    const result = await sweepAiAcrossAssessments({
      aiModelId: body.aiModelId,
      limit: body.limit,
      actorId: user.id,
    });
    await writeAudit({
      actorId: user.id,
      action: "competition.ai_sweep",
      entityType: "AiBenchmarkRun",
      metadata: {
        modelId: result.modelId,
        count: result.results.length,
        cleared: result.results.filter((r) => r.correct).length,
      },
    });
    return jsonOk(result, { status: 201 });
  });
}
