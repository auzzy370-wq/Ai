import { Suspense } from "react";
import { getSessionUser, isPremium } from "@/server/auth/session";
import { PricingClient } from "@/components/saas/pricing-client";
import { stripeEnabled } from "@/server/saas/stripe";

export default async function PricingPage() {
  const user = await getSessionUser();
  const mockBilling = process.env.ALLOW_MOCK_BILLING === "true";
  return (
    <Suspense fallback={<div className="text-slate-600">Loading pricing…</div>}>
      <PricingClient
        premium={isPremium(user)}
        planExpiresAt={user?.planExpiresAt?.toISOString() ?? null}
        stripeConfigured={stripeEnabled()}
        mockBilling={mockBilling}
      />
    </Suspense>
  );
}
