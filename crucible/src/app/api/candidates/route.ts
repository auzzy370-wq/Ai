import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canManageCandidates, canReview } from "@/server/auth/session";
import { AppError } from "@/lib/errors";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    if (!canManageCandidates(user.role) && !canReview(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const candidates = await prisma.user.findMany({
      where: { role: { in: ["CANDIDATE", "TEAM_MEMBER"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        githubLogin: true,
        createdAt: true,
        candidateProfile: {
          include: {
            skills: true,
            resumes: { orderBy: { uploadedAt: "desc" }, take: 1 },
          },
        },
        assignments: {
          include: { scoreReport: true, assessment: { select: { track: true, title: true } } },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(candidates);
  });
}
