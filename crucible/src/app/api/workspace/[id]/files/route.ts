import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, canReview } from "@/server/auth/session";
import { upsertWorkspaceFile } from "@/server/execution/workspace";
import { AppError } from "@/lib/errors";

async function assertAccess(workspaceId: string, userId: string, role: string) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { assignment: true },
  });
  if (!ws) throw new AppError("Workspace not found", 404, "NOT_FOUND");
  if (ws.assignment.candidateId !== userId && !canReview(role as never)) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  return ws;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const ws = await assertAccess(id, user.id, user.role);
    const files = await prisma.workspaceFile.findMany({
      where: { workspaceId: ws.id },
      orderBy: { path: "asc" },
    });
    return jsonOk({ workspace: ws, files });
  });
}

const schema = z.object({
  path: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    await assertAccess(id, user.id, user.role);
    const body = schema.parse(await req.json());
    if (body.path.includes("..")) throw new AppError("Invalid path", 400, "INVALID_PATH");
    const file = await upsertWorkspaceFile({
      workspaceId: id,
      filePath: body.path,
      content: body.content,
      language: body.language,
    });
    return jsonOk(file);
  });
}
