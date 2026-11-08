"use client";

import { CraftPathClient } from "@/components/learn/craft-path-client";

export function AiCraftClient() {
  return (
    <CraftPathClient
      track="ai"
      eyebrow="AI CRAFT"
      title="Ship AI features with judgment"
      blurb="Prompting, APIs, tools, RAG, agents, evals, and safety. Each lesson earns XP; then practice on real problems."
      progressApi="/api/learn/ai/progress"
      lessonHref={(slug) => `/learn/ai/${slug}`}
      levels={[
        { id: "foundations", label: "Foundations" },
        { id: "builder", label: "Builder" },
        { id: "production", label: "Production" },
      ]}
      secondaryCtas={[
        { href: "/study-plans", label: "Study plans", variant: "secondary" },
        { href: "/learn", label: "Learn hub", variant: "ghost" },
      ]}
    />
  );
}
