"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_PRICING, PREMIUM_FEATURES } from "@/lib/saas";

export function PricingClient(props: {
  premium: boolean;
  planExpiresAt?: string | null;
  stripeConfigured: boolean;
  /** Local/demo only — never true in production without explicit ALLOW_MOCK_BILLING. */
  mockBilling?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");

  useEffect(() => {
    if (params.get("upgraded") === "1" || params.get("checkout") === "success") {
      toast.success("Premium unlocked");
      router.replace("/pricing");
      router.refresh();
    }
    if (params.get("checkout") === "cancel") {
      toast.message("Checkout canceled");
      router.replace("/pricing");
    }
  }, [params, router]);

  async function upgrade() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Checkout failed");
      if (json.data.url) {
        window.location.href = json.data.url;
        return;
      }
      toast.success("Premium unlocked");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-8">
      <header className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">PROVE THE CRAFT</p>
        <h1 className="mt-3 font-serif-display text-3xl tracking-tight sm:text-4xl">
          Evidence over puzzles
        </h1>
        <p className="mt-3 text-slate-600">
          Free forever for core evidence sessions. Premium unlocks company intel, Lightning Judge, study plans,
          simulations, autocomplete, debugger, and unlimited playgrounds.
        </p>
        {props.premium && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-900 dark:text-amber-100">
            <Badge variant="amber">Premium</Badge>
            Active
            {props.planExpiresAt ? ` · renews/expires ${new Date(props.planExpiresAt).toLocaleDateString()}` : ""}
          </div>
        )}
      </header>

      <section className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Coding judges + production missions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="font-mono text-3xl text-slate-900">$0</div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>Public evidence sessions + daily challenge</li>
              <li>Free study plans</li>
              <li>3 playgrounds</li>
              <li>Standard judge queue · six languages</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-orange-300/60 bg-orange-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Premium</CardTitle>
              <Badge variant="brand">Most popular</Badge>
            </div>
            <CardDescription>Full craft loop — company tags, Lightning Judge, verified depth</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="font-mono text-3xl text-slate-900">
                ${interval === "yearly" ? PLAN_PRICING.yearly : PLAN_PRICING.monthly}
              </div>
              <div className="pb-1 text-sm text-slate-600">/{interval === "yearly" ? "year" : "month"}</div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={interval === "monthly" ? "default" : "secondary"}
                onClick={() => setInterval("monthly")}
              >
                Monthly
              </Button>
              <Button
                type="button"
                size="sm"
                variant={interval === "yearly" ? "default" : "secondary"}
                onClick={() => setInterval("yearly")}
              >
                Yearly · save more
              </Button>
            </div>
            {props.stripeConfigured || props.mockBilling ? (
              <Button className="w-full" disabled={busy || props.premium} onClick={upgrade}>
                {props.premium
                  ? "Already Premium"
                  : busy
                    ? "Redirecting…"
                    : props.stripeConfigured
                      ? "Checkout with Stripe"
                      : "Enable demo Premium (no charge)"}
              </Button>
            ) : (
              <Button className="w-full" disabled>
                Premium checkout unavailable
              </Button>
            )}
            <p className="text-xs text-slate-500">
              {props.stripeConfigured
                ? "Secure Stripe Checkout. Webhooks activate Premium on payment."
                : props.mockBilling
                  ? "Demo billing only — set STRIPE_SECRET_KEY for real Checkout, or unset ALLOW_MOCK_BILLING in production."
                  : "Stripe is not configured. Premium upgrades are disabled on this deployment."}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PREMIUM_FEATURES.map((f) => (
          <Card key={f.id} className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600">{f.blurb}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
