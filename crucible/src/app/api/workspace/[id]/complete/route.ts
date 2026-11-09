import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canReview, isPremium } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { completeCode } from "@/server/ai/autocomplete";

const schema = z.object({
  path: z.string(),
  prefix: z.string().max(4000),
  suffix: z.string().max(2000).optional(),
  language: z.string().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!isPremium(user)) {
      throw new AppError("AI autocomplete requires Premium", 402, "PREMIUM_REQUIRED");
    }
    const { id } = await ctx.params;
    const ws = await prisma.workspace.findUnique({
      where: { id },
      include: { assignment: true },
    });
    if (!ws) throw new AppError("Not found", 404, "NOT_FOUND");
    if (ws.assignment.candidateId !== user.id && !canReview(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const body = schema.parse(await req.json());
    const suggestions = await completeCode({
      language: body.language ?? ws.language,
      path: body.path,
      prefix: body.prefix,
      suffix: body.suffix ?? "",
    });
    return jsonOk({ suggestions });
  });
}
