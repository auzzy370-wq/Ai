/** Shared difficulty scale used across problemset, IDE, and generators. */
export type DifficultyBand = "Easy" | "Medium" | "Hard" | "Expert" | "Impossible";

export function difficultyBand(difficulty: number): DifficultyBand {
  if (difficulty <= 3) return "Easy";
  if (difficulty <= 6) return "Medium";
  if (difficulty <= 8) return "Hard";
  if (difficulty === 9) return "Expert";
  return "Impossible";
}

export function difficultyBandClass(band: DifficultyBand): string {
  if (band === "Easy") return "text-emerald-400 border-emerald-500/30";
  if (band === "Medium") return "text-amber-300 border-amber-500/30";
  if (band === "Hard") return "text-rose-400 border-rose-500/30";
  if (band === "Expert") return "text-violet-300 border-violet-500/30";
  return "text-fuchsia-300 border-fuchsia-500/40";
}

/** Weighted pick so the library scales Easy → Impossible (not flat). */
export function difficultyFromIndex(i: number): number {
  const r = i % 100;
  if (r < 28) return 1 + (i % 3); // Easy 1-3 ~28%
  if (r < 58) return 4 + (i % 3); // Medium 4-6 ~30%
  if (r < 78) return 7 + (i % 2); // Hard 7-8 ~20%
  if (r < 92) return 9; // Expert ~14%
  return 10; // Impossible ~8%
}

export const DIFFICULTY_BLURBS: Record<DifficultyBand, string> = {
  Easy: "Warm-up fundamentals — clear examples, forgiving constraints.",
  Medium: "Interview-standard craft — edge cases and solid complexity.",
  Hard: "Production pressure — concurrency, abuse, tight budgets.",
  Expert: "Staff-level — multi-constraint design with sparse hints.",
  Impossible: "Near-research / adversarial — extreme limits; partial credit via evidence.",
};
