import { prisma } from "@/lib/db";

/** Adaptive practice roadmap from assignment outcomes + knowledge pinpoint gaps. */
export async function buildLearnerRoadmap(userId: string) {
  const [assignments, profile] = await Promise.all([
    prisma.assessmentAssignment.findMany({
      where: { candidateId: userId },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        status: true,
        currentLevel: true,
        maxLevelReached: true,
        assessment: {
          select: {
            challenge: {
              select: { id: true, slug: true, title: true, difficulty: true, tags: true, type: true },
            },
          },
        },
      },
    }),
    prisma.candidateProfile.findUnique({
      where: { userId },
      select: { knowledgeMap: true },
    }),
  ]);

  const tagFails = new Map<string, number>();
  const tagWins = new Map<string, number>();
  let solvedEasy = 0;
  let solvedMedium = 0;
  let solvedHard = 0;
  const gaps: string[] = [];

  for (const a of assignments) {
    const c = a.assessment.challenge;
    const done = ["COMPLETED", "UNDER_REVIEW", "SUBMITTED", "GRADING"].includes(a.status);
    const failed = a.status === "FAILED" || a.status === "EXPIRED";
    for (const t of c.tags.filter((x: string) => x !== "coding")) {
      if (done) tagWins.set(t, (tagWins.get(t) ?? 0) + 1);
      if (failed) tagFails.set(t, (tagFails.get(t) ?? 0) + 1);
    }
    if (done) {
      if (c.difficulty <= 3) solvedEasy += 1;
      else if (c.difficulty <= 6) solvedMedium += 1;
      else solvedHard += 1;
    }
  }

  const km = profile?.knowledgeMap as { gaps?: { name?: string }[] } | null;
  if (km?.gaps) {
    for (const g of km.gaps) if (g.name) gaps.push(g.name);
  }

  const weakTags = [...tagFails.entries()]
    .map(([tag, fails]) => ({ tag, fails, wins: tagWins.get(tag) ?? 0 }))
    .filter((t) => t.fails > t.wins)
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 5);

  let targetDifficulty = 2;
  if (solvedEasy >= 5) targetDifficulty = 4;
  if (solvedMedium >= 5) targetDifficulty = 6;
  if (solvedHard >= 3) targetDifficulty = 8;
  if (weakTags.length) targetDifficulty = Math.max(2, targetDifficulty - 1);

  const focusTags = weakTags.map((t) => t.tag);
  const takenIds = assignments.map((a) => a.assessment.challenge.id);
  let nextProblems = await prisma.challenge.findMany({
    where: {
      type: "CODING_PROBLEM",
      isPublished: true,
      difficulty: { gte: targetDifficulty - 1, lte: targetDifficulty + 1 },
      ...(focusTags.length ? { tags: { hasSome: focusTags } } : {}),
      id: { notIn: takenIds.length ? takenIds : ["_none_"] },
    },
    select: { id: true, slug: true, title: true, difficulty: true, tags: true },
    orderBy: [{ frequency: "desc" }, { difficulty: "asc" }],
    take: 8,
  });
  if (!nextProblems.length) {
    nextProblems = await prisma.challenge.findMany({
      where: {
        type: "CODING_PROBLEM",
        isPublished: true,
        difficulty: { lte: Math.max(3, targetDifficulty) },
        id: { notIn: takenIds.length ? takenIds : ["_none_"] },
      },
      select: { id: true, slug: true, title: true, difficulty: true, tags: true },
      orderBy: [{ frequency: "desc" }],
      take: 8,
    });
  }

  const mastery = {
    easy: solvedEasy,
    medium: solvedMedium,
    hard: solvedHard,
    level:
      solvedHard >= 5 ? "advanced" : solvedMedium >= 8 ? "intermediate" : solvedEasy >= 3 ? "building" : "starter",
  };

  const { AI_CRAFT_PLAN_SLUG, AI_LESSONS } = await import("@/server/learning/ai-curriculum");
  const { INTERVIEW_CRAFT_PLAN_SLUG, INTERVIEW_LESSONS } = await import(
    "@/server/learning/interview-curriculum"
  );
  const [aiEnrollment, ivEnrollment] = await Promise.all([
    prisma.studyPlanEnrollment.findUnique({
      where: { userId_planSlug: { userId, planSlug: AI_CRAFT_PLAN_SLUG } },
    }),
    prisma.studyPlanEnrollment.findUnique({
      where: { userId_planSlug: { userId, planSlug: INTERVIEW_CRAFT_PLAN_SLUG } },
    }),
  ]);
  const aiLessonsDone = aiEnrollment?.completedSlugs?.length ?? 0;
  const ivLessonsDone = ivEnrollment?.completedSlugs?.length ?? 0;

  return {
    mastery,
    weakTags,
    recurringGaps: [...new Set(gaps)].slice(0, 8),
    targetDifficulty,
    nextProblems,
    skillTree: [
      {
        id: "interview-craft",
        label: "Interview Craft",
        prereq: [] as string[],
        mastery: ivLessonsDone,
        total: INTERVIEW_LESSONS.length,
        href: "/learn/interview",
      },
      { id: "arrays", label: "Arrays & hashing", prereq: ["interview-craft"], mastery: tagWins.get("arrays") ?? 0 },
      { id: "two-pointers", label: "Two pointers", prereq: ["arrays"], mastery: tagWins.get("two-pointers") ?? 0 },
      { id: "graphs", label: "Graphs", prereq: ["arrays"], mastery: tagWins.get("graphs") ?? 0 },
      { id: "dp", label: "Dynamic programming", prereq: ["arrays", "two-pointers"], mastery: tagWins.get("dp") ?? 0 },
      {
        id: "system-design",
        label: "System design missions",
        prereq: ["graphs"],
        mastery: assignments.filter(
          (a) => a.assessment.challenge.type !== "CODING_PROBLEM" && a.status === "COMPLETED",
        ).length,
      },
      {
        id: "ai-craft",
        label: "AI Craft (prompt → ship)",
        prereq: [],
        mastery: aiLessonsDone,
        total: AI_LESSONS.length,
        href: "/learn/ai",
      },
    ],
  };
}
