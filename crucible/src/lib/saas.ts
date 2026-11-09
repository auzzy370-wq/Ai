export const PREMIUM_FEATURES = [
  {
    id: "company-questions",
    title: "Company-tagged practice",
    blurb: "Filter timed sessions by company tags and estimated frequency.",
  },
  {
    id: "lightning-judge",
    title: "Lightning Judge",
    blurb: "Higher priority in the Docker judge queue when a worker is attached and busy.",
  },
  {
    id: "premium-content",
    title: "Premium content",
    blurb: "Extra missions, editorials, and harness packs marked Premium.",
  },
  {
    id: "autocomplete",
    title: "Autocomplete",
    blurb: "Language-aware completions in the workspace editor (provider key required).",
  },
  {
    id: "debugger",
    title: "Debugger",
    blurb: "Interactive debug helpers in the workspace — beyond print statements.",
  },
  {
    id: "interview-sims",
    title: "Timed company mocks",
    blurb: "Company-tagged timed rounds using the same public + hidden judge path as assessments.",
  },
  {
    id: "cloud-storage",
    title: "Cloud storage",
    blurb: "Workspace files sync so sessions continue across devices.",
  },
  {
    id: "unlimited-playgrounds",
    title: "Unlimited playgrounds",
    blurb: "Create unlimited playgrounds and organize them with folders.",
  },
] as const;

export const FREE_PLAYGROUND_LIMIT = 3;

export const PLAN_PRICING = {
  monthly: 35,
  yearly: 159,
} as const;

export const COMPANIES = [
  "Google",
  "Meta",
  "Amazon",
  "Apple",
  "Microsoft",
  "Stripe",
  "Netflix",
  "Uber",
  "Cloudflare",
  "Bloomberg",
  "LinkedIn",
  "Shopify",
] as const;
