import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { FREE_PLAYGROUND_LIMIT } from "@/lib/saas";
import { jsonOk, withHandler } from "@/server/auth/api";
import { isPremium, requireUser } from "@/server/auth/session";

export async function GET() {
  return withHandler(async () => {
    const user = await requireUser();
    const playgrounds = await prisma.playground.findMany({
      where: { userId: user.id },
      orderBy: [{ folder: "asc" }, { updatedAt: "desc" }],
    });
    return jsonOk({
      playgrounds,
      premium: isPremium(user),
      limit: isPremium(user) ? null : FREE_PLAYGROUND_LIMIT,
    });
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  folder: z.string().min(1).max(60).default("Inbox"),
  language: z.string().default("typescript"),
  content: z.string().optional(),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());
    const count = await prisma.playground.count({ where: { userId: user.id } });
    if (!isPremium(user) && count >= FREE_PLAYGROUND_LIMIT) {
      throw new AppError(
        `Free plan allows ${FREE_PLAYGROUND_LIMIT} playgrounds. Upgrade to Premium for unlimited.`,
        402,
        "PLAN_LIMIT",
      );
    }
    const playground = await prisma.playground.create({
      data: {
        userId: user.id,
        name: body.name,
        folder: body.folder,
        language: body.language,
        content:
          body.content ??
          `// ${body.name}\nexport function main() {\n  return null;\n}\n`,
      },
    });
    return jsonOk(playground, { status: 201 });
  });
}
