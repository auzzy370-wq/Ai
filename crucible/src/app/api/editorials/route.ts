import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser, isPremium } from "@/server/auth/session";

export async function GET(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const premium = isPremium(user);
    const slug = new URL(req.url).searchParams.get("slug");
    if (slug) {
      const ed = await prisma.editorial.findUnique({
        where: { slug },
        include: { challenge: { select: { slug: true, title: true } } },
      });
      if (!ed || !ed.published) return jsonOk(null);
      if (ed.isPremium && !premium) {
        return jsonOk({
          locked: true,
          title: ed.title,
          challenge: ed.challenge,
          approach: ed.approach,
          complexity: ed.complexity,
        });
      }
      return jsonOk(ed);
    }
    const list = await prisma.editorial.findMany({
      where: { published: true },
      select: {
        id: true,
        slug: true,
        title: true,
        approach: true,
        complexity: true,
        isPremium: true,
        challenge: { select: { slug: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk({ editorials: list, premium });
  });
}
