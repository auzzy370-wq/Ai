import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe, planDays, stripeEnabled } from "@/server/saas/stripe";
import { writeAudit } from "@/server/security/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripeEnabled()) {
    return Response.json({ ok: false, error: "Stripe not configured" }, { status: 503 });
  }
  const stripe = getStripe()!;
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !sig) {
    return Response.json({ ok: false, error: "Webhook signature required" }, { status: 400 });
  }
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid webhook" },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { userId?: string; interval?: string };
      customer?: string;
    };
    const userId = session.metadata?.userId;
    const interval = (session.metadata?.interval === "monthly" ? "monthly" : "yearly") as
      | "monthly"
      | "yearly";
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: "PREMIUM",
          planExpiresAt: new Date(Date.now() + planDays(interval) * 24 * 60 * 60 * 1000),
          stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
        },
      });
      await writeAudit({
        actorId: userId,
        action: "billing.checkout.completed",
        entityType: "User",
        entityId: userId,
        metadata: { interval, via: "stripe_webhook" },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as { metadata?: { userId?: string }; customer?: string };
    const userId = sub.metadata?.userId;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "FREE", planExpiresAt: null },
      });
    } else if (typeof sub.customer === "string") {
      await prisma.user.updateMany({
        where: { stripeCustomerId: sub.customer },
        data: { plan: "FREE", planExpiresAt: null },
      });
    }
  }

  return Response.json({ ok: true, received: true });
}
