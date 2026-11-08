import { isPremium } from "@/server/auth/session";
import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { StudyPlansClient } from "@/components/saas/study-plans-client";
import { prisma } from "@/lib/db";
import { STUDY_PLANS } from "@/server/saas/study-plans";
import { AI_LESSONS } from "@/server/learning/ai-curriculum";
import { INTERVIEW_LESSONS } from "@/server/learning/interview-curriculum";
import {
  buildStudyPlanSummary,
  itemXp,
  scorePlanProgress,
  type PlanGameView,
} from "@/server/learning/study-plan-game";

export default async function StudyPlansPage() {
  const user = await requirePageRoles(CANDIDATE_ROLES);
  const enrollments = await prisma.studyPlanEnrollment.findMany({ where: { userId: user.id } });
  const bySlug = new Map(enrollments.map((e) => [e.planSlug, e]));
  const challengeSlugs = STUDY_PLANS.filter((p) => p.itemKind !== "lesson").flatMap((p) => p.challengeSlugs);
  const challenges = await prisma.challenge.findMany({
    where: { slug: { in: challengeSlugs } },
    select: { id: true, slug: true, title: true, difficulty: true, isPremium: true, avgMinutes: true },
  });
  const challengeBySlug = new Map(challenges.map((c) => [c.slug, c]));
  const lessonBySlug = new Map(
    [...AI_LESSONS, ...INTERVIEW_LESSONS].map((l) => [
      l.slug,
      {
        ...l,
        hrefBase: AI_LESSONS.some((a) => a.slug === l.slug) ? "/learn/ai" : "/learn/interview",
      },
    ]),
  );

  const difficultyBySlug = new Map<string, number>();
  for (const c of challenges) difficultyBySlug.set(c.slug, c.difficulty);
  for (const l of [...AI_LESSONS, ...INTERVIEW_LESSONS]) {
    difficultyBySlug.set(
      l.slug,
      l.level === "foundations" ? 2 : l.level === "builder" || l.level === "patterns" ? 5 : 8,
    );
  }

  const plans = STUDY_PLANS.map((plan) => {
    const enr = bySlug.get(plan.slug);
    const completed = new Set(enr?.completedSlugs ?? []);
    const items =
      plan.itemKind === "lesson"
        ? plan.challengeSlugs
            .map((slug) => lessonBySlug.get(slug))
            .filter(Boolean)
            .map((l) => ({
              id: l!.slug,
              slug: l!.slug,
              title: l!.title,
              difficulty: difficultyBySlug.get(l!.slug) ?? 4,
              avgMinutes: l!.minutes,
              done: completed.has(l!.slug),
              href: `${l!.hrefBase}/${l!.slug}`,
              xp: itemXp({ itemKind: "lesson" }),
            }))
        : plan.challengeSlugs
            .map((slug) => challengeBySlug.get(slug))
            .filter(Boolean)
            .map((c) => ({
              id: c!.id,
              slug: c!.slug,
              title: c!.title,
              difficulty: c!.difficulty,
              avgMinutes: c!.avgMinutes,
              done: completed.has(c!.slug),
              href: `/challenges?q=${encodeURIComponent(c!.slug)}`,
              xp: itemXp({ itemKind: "challenge", difficulty: c!.difficulty }),
            }));

    const scored = scorePlanProgress(plan, completed, difficultyBySlug);
    const view: PlanGameView & { items: typeof items } = {
      ...plan,
      enrolled: Boolean(enr),
      completedCount: completed.size,
      totalCount: plan.challengeSlugs.length,
      percent: plan.challengeSlugs.length
        ? Math.round((completed.size / plan.challengeSlugs.length) * 100)
        : 0,
      items,
      ...scored,
    };
    return view;
  });

  return <StudyPlansClient plans={plans} summary={buildStudyPlanSummary(plans)} premium={isPremium(user)} />;
}
