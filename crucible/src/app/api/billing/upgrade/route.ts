import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";

/** Mock one-click upgrades are disabled. Use Stripe checkout. */
export async function POST() {
  return withHandler(async () => {
    await requireUser();
    throw new AppError(
      "Use /api/billing/checkout with Stripe configured. Demo upgrades are disabled.",
      410,
      "MOCK_UPGRADE_DISABLED",
    );
  });
}

export async function DELETE() {
  return withHandler(async () => {
    const user = await requireUser();
    if (process.env.ALLOW_MOCK_BILLING !== "true") {
      throw new AppError("Billing changes require Stripe portal", 503, "BILLING_DISABLED");
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { plan: "FREE", planExpiresAt: null },
      select: { id: true, email: true, plan: true, planExpiresAt: true },
    });
    return jsonOk(updated);
  });
}
