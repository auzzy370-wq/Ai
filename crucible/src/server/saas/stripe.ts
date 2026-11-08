import Stripe from "stripe";
import { PLAN_PRICING } from "@/lib/saas";

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3847"
  ).replace(/\/$/, "");
}

export function priceAmountCents(interval: "monthly" | "yearly") {
  return interval === "yearly" ? PLAN_PRICING.yearly * 100 : PLAN_PRICING.monthly * 100;
}

export function planDays(interval: "monthly" | "yearly") {
  return interval === "yearly" ? 365 : 31;
}
