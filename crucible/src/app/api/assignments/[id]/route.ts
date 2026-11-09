import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canReview } from "@/server/auth/session";
import { getAssignmentDetail, startAssignment, advanceAdaptiveLevel } from "@/server/assessments/service";
import { AppError } from "@/lib/errors";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const detail = await getAssignmentDetail(id);
    if (
      detail.candidateId !== user.id &&
      !canReview(user.role)
    ) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return jsonOk(detail);
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json();
    if (body.action === "start") {
      return jsonOk(await startAssignment(id, user.id));
    }
    if (body.action === "advance_level") {
      const detail = await getAssignmentDetail(id);
      if (detail.candidateId !== user.id && !canReview(user.role)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }
      return jsonOk(await advanceAdaptiveLevel(id));
    }
    throw new AppError("Unknown action", 400, "BAD_REQUEST");
  });
}
