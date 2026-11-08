import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const playground = await prisma.playground.findUnique({ where: { id } });
    if (!playground || playground.userId !== user.id) {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }
    return jsonOk(playground);
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  folder: z.string().min(1).max(60).optional(),
  content: z.string().optional(),
  language: z.string().optional(),
  layout: z.unknown().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await prisma.playground.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }
    const body = patchSchema.parse(await req.json());
    const playground = await prisma.playground.update({
      where: { id },
      data: {
        name: body.name,
        folder: body.folder,
        content: body.content,
        language: body.language,
        layout: body.layout as never,
      },
    });
    return jsonOk(playground);
  });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await prisma.playground.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }
    await prisma.playground.delete({ where: { id } });
    return jsonOk({ deleted: true });
  });
}
