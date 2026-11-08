import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, isPremium } from "@/server/auth/session";
import { ensureActiveContest, upsertContestScore } from "@/server/saas/contests";
import { z } from "zod";
import { AppError } from "@/lib/errors";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const contest = await ensureActiveContest();
    return jsonOk({ contest, premium: isPremium(user) });
  });
}

const scoreSchema = z.object({
  contestId: z.string(),
  deltaScore: z.number().min(1).max(500),
  penaltyMin: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = scoreSchema.parse(await req.json());
    const contest = await ensureActiveContest();
    if (!contest || contest.id !== body.contestId) {
      throw new AppError("Contest not active", 400, "BAD_REQUEST");
    }
    const entry = await upsertContestScore({
      contestId: body.contestId,
      userId: user.id,
      deltaScore: body.deltaScore,
      penaltyMin: body.penaltyMin,
    });
    return jsonOk(entry);
  });
}
