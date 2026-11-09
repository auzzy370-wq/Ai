import { z } from "zod";
import { ReviewDecisionType } from "@prisma/client";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canReview } from "@/server/auth/session";
import { submitReview, addReviewNote } from "@/server/reviews/service";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canReview(user.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    const queue = await prisma.assessmentAssignment.findMany({
      where: { status: { in: ["UNDER_REVIEW", "GRADING", "SUBMITTED"] } },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        assessment: { include: { challenge: true } },
        scoreReport: true,
        submissions: { include: { aiEvaluations: true, testRuns: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk(queue);
  });
}

const schema = z.object({
  assignmentId: z.string(),
  decision: z.nativeEnum(ReviewDecisionType),
  reasoning: z.string().min(20),
  overridesAi: z.boolean().optional(),
  verifiedSkills: z.array(z.string()).optional(),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canReview(user.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    const body = schema.parse(await req.json());
    const decision = await submitReview({
      assignmentId: body.assignmentId,
      reviewerId: user.id,
      decision: body.decision,
      reasoning: body.reasoning,
      overridesAi: body.overridesAi,
      verifiedSkills: body.verifiedSkills,
    });
    if (body.note) {
      await addReviewNote({
        assignmentId: body.assignmentId,
        authorId: user.id,
        body: body.note,
      });
    }
    return jsonOk(decision);
  });
}
