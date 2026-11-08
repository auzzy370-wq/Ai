import type { StudyPlanDef } from "@/server/saas/study-plans";
import { LESSON_XP } from "@/server/learning/gamification";

export function itemXp(opts: { itemKind?: "lesson" | "challenge"; difficulty?: number }) {
  if (opts.itemKind === "lesson") return LESSON_XP;
  const d = Math.max(1, Math.min(10, opts.difficulty ?? 4));
  return 35 + d * 8;
}

export type PlanGameView = {
  slug: string;
  title: string;
  subtitle: string;
  company?: string;
  role: string;
  days: number;
  premium: boolean;
  track?: string;
  itemKind?: "lesson" | "challenge";
  enrolled: boolean;
  completedCount: number;
  totalCount: number;
  percent: number;
  earnedXp: number;
  totalXp: number;
  remainingXp: number;
  nextItemSlug: string | null;
  complete: boolean;
};

export function scorePlanProgress(
  plan: StudyPlanDef,
  completed: Set<string>,
  difficultyBySlug: Map<string, number>,
): Pick<PlanGameView, "earnedXp" | "totalXp" | "remainingXp" | "complete" | "nextItemSlug"> {
  let earned = 0;
  let total = 0;
  for (const slug of plan.challengeSlugs) {
    const xp = itemXp({
      itemKind: plan.itemKind,
      difficulty: difficultyBySlug.get(slug),
    });
    total += xp;
    if (completed.has(slug)) earned += xp;
  }
  const complete = plan.challengeSlugs.length > 0 && plan.challengeSlugs.every((s) => completed.has(s));
  const nextItemSlug = plan.challengeSlugs.find((s) => !completed.has(s)) ?? null;
  return {
    earnedXp: earned,
    totalXp: total,
    remainingXp: Math.max(0, total - earned),
    complete,
    nextItemSlug,
  };
}

export type StudyPlanSummary = {
  enrolledCount: number;
  completedPlans: number;
  activeSlug: string | null;
  totalEarnedXp: number;
  next: { title: string; detail: string };
};

export function buildStudyPlanSummary(plans: PlanGameView[]): StudyPlanSummary {
  const enrolled = plans.filter((p) => p.enrolled);
  const active =
    enrolled.find((p) => !p.complete && p.nextItemSlug) ?? enrolled.find((p) => !p.complete) ?? null;

  return {
    enrolledCount: enrolled.length,
    completedPlans: enrolled.filter((p) => p.complete).length,
    activeSlug: active?.slug ?? null,
    totalEarnedXp: enrolled.reduce((s, p) => s + p.earnedXp, 0),
    next: active
      ? { title: active.title, detail: `${active.completedCount}/${active.totalCount} problems done` }
      : { title: "Pick a plan", detail: "Choose a company or role plan below to track your progress." },
  };
}
