import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";

const schema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    if (body.userId === user.id) throw new AppError("Cannot follow yourself", 400, "BAD_REQUEST");
    const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } });
    if (!target) throw new AppError("User not found", 404, "NOT_FOUND");
    await prisma.developerFollow.upsert({
      where: { followerId_followingId: { followerId: user.id, followingId: body.userId } },
      create: { followerId: user.id, followingId: body.userId },
      update: {},
    });
    return jsonOk({ following: true });
  });
}

export async function DELETE(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) throw new AppError("userId required", 400, "BAD_REQUEST");
    await prisma.developerFollow.deleteMany({
      where: { followerId: user.id, followingId: userId },
    });
    return jsonOk({ following: false });
  });
}

export async function GET(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || user.id;
    const [followers, following] = await Promise.all([
      prisma.developerFollow.count({ where: { followingId: userId } }),
      prisma.developerFollow.count({ where: { followerId: userId } }),
    ]);
    const iFollow =
      userId !== user.id
        ? Boolean(
            await prisma.developerFollow.findUnique({
              where: { followerId_followingId: { followerId: user.id, followingId: userId } },
            }),
          )
        : false;
    return jsonOk({ followers, following, iFollow });
  });
}
