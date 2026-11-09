import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { writeAudit } from "@/server/security/audit";
import { appBaseUrl, getStripe, planDays, priceAmountCents, stripeEnabled } from "@/server/saas/stripe";

const schema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("yearly"),
});

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const body = schema.parse(await req.json().catch(() => ({ interval: "yearly" })));
    const base = appBaseUrl();

    // Mock premium only when explicitly enabled for local demos — never in published apps.
    if (!stripeEnabled()) {
      if (process.env.ALLOW_MOCK_BILLING !== "true") {
        const { AppError } = await import("@/lib/errors");
        throw new AppError("Billing is not configured", 503, "BILLING_DISABLED");
      }
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "PREMIUM",
          planExpiresAt: new Date(Date.now() + planDays(body.interval) * 24 * 60 * 60 * 1000),
        },
        select: { id: true, plan: true, planExpiresAt: true },
      });
      await writeAudit({
        actorId: user.id,
        action: "billing.checkout.mock",
        entityType: "User",
        entityId: user.id,
        metadata: { interval: body.interval },
      });
      return jsonOk({
        mode: "mock",
        url: `${base}/pricing?upgraded=1`,
        ...updated,
      });
    }

    const stripe = getStripe()!;
    let customerId = user.id;
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (dbUser.stripeCustomerId) {
      customerId = dbUser.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${base}/pricing?checkout=success`,
      cancel_url: `${base}/pricing?checkout=cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: priceAmountCents(body.interval),
            recurring: { interval: body.interval === "yearly" ? "year" : "month" },
            product_data: {
              name: "CRUCIBLE Premium",
              description: "Company questions, Lightning Judge, simulations, autocomplete, unlimited playgrounds",
            },
          },
        },
      ],
      metadata: { userId: user.id, interval: body.interval },
      subscription_data: {
        metadata: { userId: user.id, interval: body.interval },
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "billing.checkout.create",
      entityType: "User",
      entityId: user.id,
      metadata: { sessionId: session.id, interval: body.interval },
    });

    return jsonOk({ mode: "stripe", url: session.url, sessionId: session.id });
  });
}
