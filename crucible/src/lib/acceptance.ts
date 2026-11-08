/** Illustrative acceptance % until live submission stats are dense enough. */
export const ACCEPTANCE_METHODOLOGY = {
  label: "Illustrative acceptance",
  short: "est.",
  detail:
    "Estimated from difficulty band and problem family until enough live submits exist. Not a measured population rate.",
} as const;

/** Shown when ≥3 live hidden_test submissions exist for a problem. */
export const LIVE_ACCEPTANCE_METHODOLOGY = {
  label: "Live acceptance",
  short: "live",
  detail: "Measured from hidden harness submissions on Crucible (min 3 runs).",
} as const;

/** Deterministic 8–72% style rate from difficulty + slug. */
export function illustrativeAcceptance(difficulty: number, slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const jitter = h % 11; // 0..10
  // Harder → lower acceptance
  const base = Math.max(8, 78 - difficulty * 7);
  return Math.min(72, Math.max(8, base - jitter));
}
