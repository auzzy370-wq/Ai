import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";

export async function GET(req: Request) {
  return withHandler(async () => {
    await requireUser(["SUPER_ADMIN"]);
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const take = Math.min(Number(url.searchParams.get("take") || 80), 200);

    const logs = await prisma.auditLog.findMany({
      where: q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return jsonOk({ logs });
  });
}
