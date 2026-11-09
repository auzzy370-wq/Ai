import { prisma } from "@/lib/db";
import { AI_CRAFT_PLAN_SLUG, AI_LESSONS, nextAiLesson } from "@/server/learning/ai-curriculum";
import {
  INTERVIEW_CRAFT_PLAN_SLUG,
  INTERVIEW_LESSONS,
  nextInterviewLesson,
} from "@/server/learning/interview-curriculum";
import { dateKey } from "@/server/saas/daily";
import { STUDY_PLANS } from "@/server/saas/study-plans";
import { itemXp } from "@/server/learning/study-plan-game";
import { ARCADE_CLEAR_XP, ARCADE_PLAN_SLUG, getArcadeGame } from "@/server/learning/arcade-games";

export const LESSON_XP = 50;
export const DAILY_XP = 75;
export const PROVE_BASE_XP = 100;
/** Extra XP per active streak day (capped). */
export const STREAK_DAY_XP = 8;
export const STREAK_MILESTONES = [3, 7, 14, 30, 60] as const;

/** XP needed to reach each level; index 0 is level 1. */
export const LEVEL_THRESHOLDS = [0, 75, 150, 300, 500, 750, 1100, 1500, 2100, 2800] as const;

export type LearnerTask = {
  id: string;
  title: string;
  detail: string;
  href: string;
  xp: number;
  done: boolean;
};

export type XpBreakdown = {
  lessons: number;
  daily: number;
  prove: number;
  studyPlans: number;
  arcade: number;
  streak: number;
  total: number;
};

export type PathChapter = {
  id: string;
  title: string;
  done: number;
  total: number;
  percent: number;
  cleared: boolean;
};

export type LearnerGameState = {
  xp: number;
  level: number;
  maxLevel: number;
  levelProgressPct: number;
  xpToNext: number | null;
  breakdown: XpBreakdown;
  streak: {
    current: number;
    longest: number;
    activeToday: boolean;
    heat: number;
    nextMilestone: number | null;
    milestones: { days: number; reached: boolean }[];
  };
  paths: {
    interview: {
      done: number;
      total: number;
      percent: number;
      nextHref: string;
      nextTitle: string | null;
      chapters: PathChapter[];
    };
    ai: {
      done: number;
      total: number;
      percent: number;
      nextHref: string;
      nextTitle: string | null;
      chapters: PathChapter[];
    };
  };
  today: LearnerTask[];
  todayDone: number;
  focus: {
    title: string;
    detail: string;
    href: string;
    cta: string;
  };
};

function levelForXp(xp: number) {
  let idx = 0;
  LEVEL_THRESHOLDS.forEach((min, i) => {
    if (xp >= min) idx = i;
  });
  const next = LEVEL_THRESHOLDS[idx + 1];
  if (next === undefined) {
    return { level: idx + 1, levelProgressPct: 100, xpToNext: null };
  }
  const floor = LEVEL_THRESHOLDS[idx]!;
  return {
    level: idx + 1,
    levelProgressPct: Math.max(0, Math.min(100, Math.round(((xp - floor) / (next - floor)) * 100))),
    xpToNext: Math.max(0, next - xp),
  };
}

function chaptersForPath(
  lessons: { slug: string; level: string }[],
  done: Set<string>,
  levelOrder: string[],
  labels: Record<string, string>,
): PathChapter[] {
  return levelOrder.map((level) => {
    const slugs = lessons.filter((l) => l.level === level).map((l) => l.slug);
    const clearedCount = slugs.filter((s) => done.has(s)).length;
    return {
      id: level,
      title: labels[level] ?? level,
      done: clearedCount,
      total: slugs.length,
      percent: slugs.length ? Math.round((clearedCount / slugs.length) * 100) : 0,
      cleared: slugs.length > 0 && clearedCount >= slugs.length,
    };
  });
}

/** Extend the streak when a lesson is completed (shares UserStreak with daily). */
export async function touchLearnStreak(userId: string) {
  const today = dateKey();
  const streak = await prisma.userStreak.findUnique({ where: { userId } });
  if (streak?.lastDateKey === today) return streak;

  const yesterday = new Date(`${today}T12:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yKey = dateKey(yesterday);

  let current = 1;
  if (streak?.lastDateKey === yKey) current = streak.currentStreak + 1;
  const longest = Math.max(current, streak?.longestStreak ?? 0);

  return prisma.userStreak.upsert({
    where: { userId },
    create: { userId, currentStreak: current, longestStreak: longest, lastDateKey: today },
    update: { currentStreak: current, longestStreak: longest, lastDateKey: today },
  });
}

export async function buildLearnerGameState(userId: string): Promise<LearnerGameState> {
  const today = dateKey();

  const [aiEnrollment, ivEnrollment, streak, dailyDone, scoredAssignments, dailyCompletions, allEnrollments] =
    await Promise.all([
      prisma.studyPlanEnrollment.findUnique({
        where: { userId_planSlug: { userId, planSlug: AI_CRAFT_PLAN_SLUG } },
      }),
      prisma.studyPlanEnrollment.findUnique({
        where: { userId_planSlug: { userId, planSlug: INTERVIEW_CRAFT_PLAN_SLUG } },
      }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.dailyChallengeCompletion.findFirst({
        where: { userId, dailyChallenge: { dateKey: today } },
        select: { id: true },
      }),
      prisma.assessmentAssignment.count({
        where: {
          candidateId: userId,
          status: { in: ["COMPLETED", "UNDER_REVIEW"] },
          scoreReport: { isNot: null },
        },
      }),
      prisma.dailyChallengeCompletion.count({ where: { userId } }),
      prisma.studyPlanEnrollment.findMany({ where: { userId } }),
    ]);

  const aiDone = aiEnrollment?.completedSlugs ?? [];
  const ivDone = ivEnrollment?.completedSlugs ?? [];
  const aiSet = new Set(aiDone);
  const ivSet = new Set(ivDone);

  let studyPlanXp = 0;
  for (const plan of STUDY_PLANS) {
    const enr = allEnrollments.find((e) => e.planSlug === plan.slug);
    if (!enr) continue;
    const completed = new Set(enr.completedSlugs);
    for (const slug of plan.challengeSlugs) {
      if (completed.has(slug)) studyPlanXp += itemXp({ itemKind: plan.itemKind, difficulty: 4 });
    }
  }

  const arcadeClearedSlugs = allEnrollments.find((e) => e.planSlug === ARCADE_PLAN_SLUG)?.completedSlugs ?? [];
  const arcadeXp = arcadeClearedSlugs.filter((slug) => getArcadeGame(slug)).length * ARCADE_CLEAR_XP;

  const nextIv = nextInterviewLesson(ivSet);
  const nextAi = nextAiLesson(aiSet);
  const nextLessonHref = nextIv
    ? `/learn/interview/${nextIv.slug}`
    : nextAi
      ? `/learn/ai/${nextAi.slug}`
      : "/learn/interview";
  const activeToday = streak?.lastDateKey === today;

  const lessonTouchedToday = Boolean(
    (ivEnrollment && dateKey(ivEnrollment.updatedAt) === today && ivDone.length > 0) ||
      (aiEnrollment && dateKey(aiEnrollment.updatedAt) === today && aiDone.length > 0),
  );

  const ivChapters = chaptersForPath(
    INTERVIEW_LESSONS,
    ivSet,
    ["foundations", "patterns", "rounds"],
    { foundations: "Foundations", patterns: "Patterns", rounds: "Rounds" },
  );
  const aiChapters = chaptersForPath(
    AI_LESSONS,
    aiSet,
    ["foundations", "builder", "production"],
    { foundations: "Foundations", builder: "Builder", production: "Production" },
  );

  const todayTasks: LearnerTask[] = [
    {
      id: "lesson",
      title: "Finish a lesson",
      detail: nextIv
        ? `Interview Craft: ${nextIv.title}`
        : nextAi
          ? `AI Craft: ${nextAi.title}`
          : "Both paths complete — revisit a favorite",
      href: nextLessonHref,
      xp: LESSON_XP,
      done: lessonTouchedToday,
    },
    {
      id: "daily",
      title: "Solve today’s problem",
      detail: dailyDone ? "Done for today" : "One timed problem, judged on hidden tests",
      href: "/daily",
      xp: DAILY_XP,
      done: Boolean(dailyDone),
    },
  ];

  const breakdown: XpBreakdown = {
    lessons: (aiDone.length + ivDone.length) * LESSON_XP,
    daily: dailyCompletions * DAILY_XP,
    prove: scoredAssignments * PROVE_BASE_XP,
    studyPlans: studyPlanXp,
    arcade: arcadeXp,
    streak:
      Math.min(240, (streak?.longestStreak ?? 0) * 10) +
      Math.min(160, (streak?.currentStreak ?? 0) * STREAK_DAY_XP),
    total: 0,
  };
  breakdown.total =
    breakdown.lessons + breakdown.daily + breakdown.prove + breakdown.studyPlans + breakdown.arcade + breakdown.streak;
  const xp = breakdown.total;

  const currentStreak = streak?.currentStreak ?? 0;
  const nextMilestone = STREAK_MILESTONES.find((d) => currentStreak < d) ?? null;

  const focus = !lessonTouchedToday
    ? {
        title: nextIv?.title ?? nextAi?.title ?? "Pick a lesson",
        detail: activeToday ? "Your streak is safe today. Keep going." : "One lesson keeps your streak alive.",
        href: nextLessonHref,
        cta: "Continue learning",
      }
    : !dailyDone
      ? {
          title: "Today’s problem",
          detail: "One timed problem, judged on hidden tests.",
          href: "/daily",
          cta: "Open problem",
        }
      : {
          title: "You’re done for today",
          detail: "Practice more in the problem bank, or run a mock interview.",
          href: "/challenges",
          cta: "Open practice",
        };

  return {
    xp,
    ...levelForXp(xp),
    maxLevel: LEVEL_THRESHOLDS.length,
    breakdown,
    streak: {
      current: currentStreak,
      longest: streak?.longestStreak ?? 0,
      activeToday,
      heat: Math.max(
        0,
        Math.min(100, Math.round((currentStreak / (nextMilestone ?? 30)) * 100) || (currentStreak > 0 ? 12 : 0)),
      ),
      nextMilestone,
      milestones: STREAK_MILESTONES.map((days) => ({
        days,
        reached: (streak?.longestStreak ?? 0) >= days || currentStreak >= days,
      })),
    },
    paths: {
      interview: {
        done: ivDone.length,
        total: INTERVIEW_LESSONS.length,
        percent: Math.round((ivDone.length / INTERVIEW_LESSONS.length) * 100),
        nextHref: nextIv ? `/learn/interview/${nextIv.slug}` : "/learn/interview",
        nextTitle: nextIv?.title ?? null,
        chapters: ivChapters,
      },
      ai: {
        done: aiDone.length,
        total: AI_LESSONS.length,
        percent: Math.round((aiDone.length / AI_LESSONS.length) * 100),
        nextHref: nextAi ? `/learn/ai/${nextAi.slug}` : "/learn/ai",
        nextTitle: nextAi?.title ?? null,
        chapters: aiChapters,
      },
    },
    today: todayTasks,
    todayDone: todayTasks.filter((t) => t.done).length,
    focus,
  };
}

/** Zeroed state for guests browsing Learn without an account. */
export function guestLearnerGameState(): LearnerGameState {
  const emptyChapters = (ids: string[], titles: Record<string, string>): PathChapter[] =>
    ids.map((id) => ({ id, title: titles[id] ?? id, done: 0, total: 1, percent: 0, cleared: false }));
  const firstIv = INTERVIEW_LESSONS[0];
  const firstAi = AI_LESSONS[0];
  const firstIvHref = firstIv ? `/learn/interview/${firstIv.slug}` : "/learn/interview";
  const today: LearnerTask[] = [
    {
      id: "lesson",
      title: "Finish a lesson",
      detail: firstIv ? `Interview Craft: ${firstIv.title}` : "Open Interview Craft",
      href: firstIvHref,
      xp: LESSON_XP,
      done: false,
    },
    {
      id: "arcade",
      title: "Play an arcade game",
      detail: "Two-minute games on hashing, Big-O and binary search",
      href: "/learn/games",
      xp: ARCADE_CLEAR_XP,
      done: false,
    },
  ];
  return {
    xp: 0,
    ...levelForXp(0),
    maxLevel: LEVEL_THRESHOLDS.length,
    breakdown: { lessons: 0, daily: 0, prove: 0, studyPlans: 0, arcade: 0, streak: 0, total: 0 },
    streak: {
      current: 0,
      longest: 0,
      activeToday: false,
      heat: 0,
      nextMilestone: STREAK_MILESTONES[0] ?? null,
      milestones: STREAK_MILESTONES.map((days) => ({ days, reached: false })),
    },
    paths: {
      interview: {
        done: 0,
        total: INTERVIEW_LESSONS.length,
        percent: 0,
        nextHref: firstIvHref,
        nextTitle: firstIv?.title ?? null,
        chapters: emptyChapters(["foundations", "patterns", "rounds"], {
          foundations: "Foundations",
          patterns: "Patterns",
          rounds: "Rounds",
        }),
      },
      ai: {
        done: 0,
        total: AI_LESSONS.length,
        percent: 0,
        nextHref: firstAi ? `/learn/ai/${firstAi.slug}` : "/learn/ai",
        nextTitle: firstAi?.title ?? null,
        chapters: emptyChapters(["foundations", "builder", "production"], {
          foundations: "Foundations",
          builder: "Builder",
          production: "Production",
        }),
      },
    },
    today,
    todayDone: 0,
    focus: {
      title: firstIv?.title ?? "Start learning",
      detail: "Everything here is free to try. Sign in when you want your progress saved.",
      href: firstIvHref,
      cta: "Start the first lesson",
    },
  };
}
