import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canReview } from "@/server/auth/session";
import { platformAnalytics } from "@/server/analytics/service";
import { AppError } from "@/lib/errors";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canReview(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return jsonOk(await platformAnalytics());
  });
}
