import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canAdmin } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { listAutoScoreTargets } from "@/server/assessments/auto-score";

export const runtime = "nodejs";

/** SUPER_ADMIN — list assignment workspaces the frontend will run suites against. */
export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canAdmin(user.role)) {
      throw new AppError("Only admins can list auto-run targets", 403, "FORBIDDEN");
    }
    const targets = await listAutoScoreTargets({ limit: 500 });
    return jsonOk({
      targets,
      count: targets.length,
      note: "Frontend runs public + hidden + deploy per target, then posts the scorecard.",
    });
  });
}
