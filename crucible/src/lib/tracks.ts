/** Shared AssessmentTrack labels and helpers (client-safe). */

export const TRACK_OPTIONS = [
  { value: "SOFTWARE_ENGINEERING", label: "Software Engineering", group: "Core" },
  { value: "CYBERSECURITY", label: "Cybersecurity", group: "Core" },
  { value: "SECURE_FULL_STACK", label: "Secure Full-Stack", group: "Core" },
  { value: "PLATFORM_SRE", label: "Platform / SRE", group: "Core" },
  { value: "DATA_ML", label: "Data / ML Engineering", group: "Core" },
  { value: "MOBILE", label: "Mobile Engineering", group: "Core" },
  { value: "PRIVACY_ENGINEERING", label: "Privacy Engineering", group: "Core" },
  { value: "FINTECH", label: "FinTech / Payments", group: "Industry" },
  { value: "HEALTHCARE", label: "Healthcare / HITRUST", group: "Industry" },
  { value: "GAME_BACKEND", label: "Game Backend", group: "Industry" },
  { value: "EMBEDDED_IOT", label: "Embedded / IoT", group: "Industry" },
  { value: "EDTECH", label: "EdTech", group: "Industry" },
  { value: "LOGISTICS", label: "Logistics / Supply Chain", group: "Industry" },
  { value: "CLIMATE_ENERGY", label: "Climate / Energy Tech", group: "Industry" },
  { value: "REGTECH", label: "RegTech / LegalTech", group: "Industry" },
  { value: "DEVTOOLS", label: "Developer Tooling", group: "Platform" },
  { value: "DESIGN_SYSTEMS", label: "Design Systems / Frontend Platform", group: "Platform" },
  { value: "GROWTH", label: "Growth / Experimentation", group: "Platform" },
  { value: "SEARCH_RECS", label: "Search / Recommendations", group: "Platform" },
  { value: "SUPPORT_ENG", label: "Support Platform Engineering", group: "Platform" },
  { value: "AI_MLOPS", label: "AI / MLOps Product", group: "Platform" },
  { value: "DATABASE_ENGINEERING", label: "Database Engineering", group: "Systems" },
  { value: "NETWORK_EDGE", label: "Networking / Edge", group: "Systems" },
  { value: "CLOUD_INFRA_SECURITY", label: "Cloud / Infra Security", group: "Systems" },
  { value: "QA_RELIABILITY", label: "QA / Reliability Engineering", group: "Systems" },
  { value: "COMPILER_TOOLING", label: "Compilers / Language Tooling", group: "Systems" },
  { value: "BLOCKCHAIN", label: "Blockchain / Web3", group: "Systems" },
] as const;

export type TrackValue = (typeof TRACK_OPTIONS)[number]["value"];

export function trackLabel(track: string): string {
  return TRACK_OPTIONS.find((t) => t.value === track)?.label ?? track.replaceAll("_", " ");
}

export function trackBadgeVariant(
  track: string,
): "default" | "brand" | "amber" | "rose" | "emerald" | "violet" {
  switch (track) {
    case "CYBERSECURITY":
    case "CLOUD_INFRA_SECURITY":
    case "BLOCKCHAIN":
      return "violet";
    case "SECURE_FULL_STACK":
    case "PRIVACY_ENGINEERING":
    case "HEALTHCARE":
    case "REGTECH":
      return "emerald";
    case "FINTECH":
    case "GROWTH":
    case "CLIMATE_ENERGY":
      return "amber";
    case "QA_RELIABILITY":
    case "PLATFORM_SRE":
      return "rose";
    default:
      return "brand";
  }
}

export function trackOptionGroups() {
  const groups = new Map<string, { value: string; label: string }[]>();
  for (const t of TRACK_OPTIONS) {
    const list = groups.get(t.group) ?? [];
    list.push({ value: t.value, label: t.label });
    groups.set(t.group, list);
  }
  return [...groups.entries()].map(([group, options]) => ({ group, options }));
}
