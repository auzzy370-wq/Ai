import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canManageCandidates } from "@/server/auth/session";
import { createAssessment } from "@/server/assessments/service";
import { AppError } from "@/lib/errors";

export async function GET() {
  return withHandler(async () => {
    await requireUser();
    const assessments = await prisma.assessment.findMany({
      include: {
        challenge: true,
        _count: { select: { assignments: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(assessments);
  });
}

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  challengeId: z.string().min(1),
  timedMinutes: z.number().int().positive().optional(),
  multiDay: z.boolean().optional(),
  allowTeam: z.boolean().optional(),
  progressiveDiff: z.boolean().optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canManageCandidates(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const body = schema.parse(await req.json());
    const assessment = await createAssessment({ ...body, createdById: user.id });
    return jsonOk(assessment, { status: 201 });
  });
}
