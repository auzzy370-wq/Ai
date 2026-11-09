import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { getSessionUser, requireUser } from "@/server/auth/session";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return withHandler(async () => {
    const { slug } = await ctx.params;
    const challenge = await prisma.challenge.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });
    if (!challenge) throw new AppError("Not found", 404, "NOT_FOUND");

    const posts = await prisma.problemDiscussion.findMany({
      where: { challengeId: challenge.id, parentId: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          take: 20,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return jsonOk({
      challenge,
      posts: posts.map((p) => ({
        id: p.id,
        body: p.body,
        createdAt: p.createdAt.toISOString(),
        author: p.user,
        replies: p.replies.map((r) => ({
          id: r.id,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
          author: r.user,
        })),
      })),
      viewerId: (await getSessionUser())?.id ?? null,
    });
  });
}

const postSchema = z.object({
  body: z.string().trim().min(3).max(4000),
  parentId: z.string().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return withHandler(async () => {
    const user = await requireUser();
    const { slug } = await ctx.params;
    const challenge = await prisma.challenge.findUnique({ where: { slug }, select: { id: true } });
    if (!challenge) throw new AppError("Not found", 404, "NOT_FOUND");
    const body = postSchema.parse(await req.json());

    if (body.parentId) {
      const parent = await prisma.problemDiscussion.findFirst({
        where: { id: body.parentId, challengeId: challenge.id },
      });
      if (!parent) throw new AppError("Parent post not found", 404, "NOT_FOUND");
    }

    const row = await prisma.problemDiscussion.create({
      data: {
        challengeId: challenge.id,
        userId: user.id,
        body: body.body,
        parentId: body.parentId,
      },
    });
    return jsonOk({ id: row.id }, { status: 201 });
  });
}
