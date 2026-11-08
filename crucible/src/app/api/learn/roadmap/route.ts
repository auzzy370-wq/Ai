import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { buildLearnerRoadmap } from "@/server/learning/roadmap";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    return jsonOk(await buildLearnerRoadmap(user.id));
  });
}
