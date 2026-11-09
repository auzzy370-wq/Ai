import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/lib/errors";

const schema = z.object({ answer: z.string().min(20) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const question = await prisma.followUpQuestion.findUnique({
      where: { id },
      include: { assignment: true },
    });
    if (!question || question.assignment.candidateId !== user.id) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const body = schema.parse(await req.json());
    // Heuristic understanding score — human review remains authoritative
    const score = Math.min(100, 40 + Math.min(40, body.answer.length / 20) + (/\b(trade-?off|consistency|isolation|latency)\b/i.test(body.answer) ? 15 : 0));
    const answer = await prisma.followUpAnswer.create({
      data: {
        questionId: id,
        userId: user.id,
        answer: body.answer,
        score,
        feedback: "Recorded for human technical review. AI tools permitted; understanding and ownership are evaluated.",
      },
    });
    return jsonOk(answer);
  });
}
