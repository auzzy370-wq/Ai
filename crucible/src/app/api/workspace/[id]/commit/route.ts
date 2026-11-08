import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { commitWorkspace } from "@/server/execution/workspace";
import { AppError } from "@/lib/errors";

const schema = z.object({ message: z.string().min(3).max(200) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const ws = await prisma.workspace.findUnique({
      where: { id },
      include: { assignment: true },
    });
    if (!ws || ws.assignment.candidateId !== user.id) throw new AppError("Forbidden", 403, "FORBIDDEN");
    const body = schema.parse(await req.json());
    const commit = await commitWorkspace({
      workspaceId: id,
      message: body.message,
      authorEmail: user.email,
    });
    return jsonOk(commit);
  });
}
