import { z } from "zod";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canManageCandidates } from "@/server/auth/session";
import { assignAssessment, listAssignmentsForUser } from "@/server/assessments/service";
import { AppError } from "@/lib/errors";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    return jsonOk(await listAssignmentsForUser(user.id, user.role));
  });
}

const schema = z.object({
  assessmentId: z.string(),
  candidateId: z.string(),
  dueAt: z.string().datetime().optional(),
  accommodations: z.string().optional(),
  language: z.string().optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canManageCandidates(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const body = schema.parse(await req.json());
    const assignment = await assignAssessment({
      assessmentId: body.assessmentId,
      candidateId: body.candidateId,
      assignedById: user.id,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      accommodations: body.accommodations,
      language: body.language,
    });
    return jsonOk(assignment, { status: 201 });
  });
}
