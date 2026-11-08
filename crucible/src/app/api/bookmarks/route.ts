import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/lib/errors";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const rows = await prisma.problemBookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        challenge: {
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
            tags: true,
            type: true,
            isPremium: true,
          },
        },
      },
      take: 200,
    });
    return jsonOk({
      bookmarks: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        challenge: r.challenge,
      })),
    });
  });
}

const bodySchema = z.object({
  challengeId: z.string().min(1),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = bodySchema.parse(await req.json());
    const challenge = await prisma.challenge.findUnique({ where: { id: body.challengeId } });
    if (!challenge || !challenge.isPublished) throw new AppError("Challenge not found", 404, "NOT_FOUND");
    const row = await prisma.problemBookmark.upsert({
      where: { userId_challengeId: { userId: user.id, challengeId: body.challengeId } },
      create: { userId: user.id, challengeId: body.challengeId },
      update: {},
    });
    return jsonOk({ bookmarked: true, id: row.id }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const challengeId = url.searchParams.get("challengeId");
    if (!challengeId) throw new AppError("challengeId required", 400, "BAD_REQUEST");
    await prisma.problemBookmark.deleteMany({
      where: { userId: user.id, challengeId },
    });
    return jsonOk({ bookmarked: false });
  });
}
