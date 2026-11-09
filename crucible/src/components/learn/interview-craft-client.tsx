"use client";

import { CraftPathClient } from "@/components/learn/craft-path-client";

export function InterviewCraftClient() {
  return (
    <CraftPathClient
      track="interview"
      eyebrow="INTERVIEW CRAFT"
      title="Prepare for the real loop"
      blurb="Live coding framework, DSA patterns, system design, behavioral STAR. Each lesson earns XP; then practice under the same judges employers use."
      progressApi="/api/learn/interview/progress"
      lessonHref={(slug) => `/learn/interview/${slug}`}
      levels={[
        { id: "foundations", label: "Foundations" },
        { id: "patterns", label: "Patterns" },
        { id: "rounds", label: "Rounds" },
      ]}
      secondaryCtas={[
        { href: "/study-plans", label: "Company packs", variant: "secondary" },
        { href: "/interview", label: "Timed mocks", variant: "ghost" },
      ]}
    />
  );
}
