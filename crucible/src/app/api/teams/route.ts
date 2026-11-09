import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canManageCandidates } from "@/server/auth/session";
import { createTeam, postDiscussion } from "@/server/teams/service";
import { AppError } from "@/lib/errors";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const teams = await prisma.engineeringTeam.findMany({
      where:
        user.role === "CANDIDATE" || user.role === "TEAM_MEMBER"
          ? { members: { some: { userId: user.id } } }
          : undefined,
      include: {
        assessment: { include: { challenge: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        discussions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(teams);
  });
}

const createSchema = z.object({
  name: z.string().min(2),
  assessmentId: z.string(),
  members: z
    .array(z.object({ userId: z.string(), roleLabel: z.string(), duties: z.string() }))
    .min(2)
    .max(4),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = await req.json();
    if (body.action === "discuss") {
      const parsed = z.object({ teamId: z.string(), body: z.string().min(1) }).parse(body);
      return jsonOk(await postDiscussion(parsed.teamId, user.id, parsed.body));
    }
    if (!canManageCandidates(user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const parsed = createSchema.parse(body);
    return jsonOk(await createTeam({ ...parsed, managerId: user.id }), { status: 201 });
  });
}
