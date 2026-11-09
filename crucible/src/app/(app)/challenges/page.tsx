import { prisma } from "@/lib/db";
import { getSessionUser, isPremium } from "@/server/auth/session";
import { Problemset } from "@/components/challenges/problemset";
import { isCodingProblem } from "@/server/challenges/coding-problems";
import { editorialSlugByChallengeSlug, resolveEditorialSlug } from "@/server/saas/editorials";
import { SaveProgressCta } from "@/components/learn/save-progress-cta";
import { JudgeBanner } from "@/components/layout/judge-banner";
import { stripeEnabled } from "@/server/saas/stripe";
import { getJudgeStatus } from "@/server/execution/judge-status";

/** First paint only — full library is browsed via /api/challenges search + load more. */
const CODING_LIMIT = 80;
const PROJECT_LIMIT = 40;

const listSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  type: true,
  track: true,
  difficulty: true,
  tags: true,
  languages: true,
  estimatedDays: true,
  companies: true,
  frequency: true,
  avgMinutes: true,
  isPremium: true,
  owaspMappings: true,
  mitreMappings: true,
  assessments: {
    where: { status: "PUBLISHED" as const },
    take: 1,
    select: { id: true },
  },
} as const;

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const trackFilter = sp.track && sp.track !== "generated" ? { track: sp.track as never } : {};
  // Full original bank is the default (hand-authored + question-bank volume).
  // Opt into hand-authored-only with ?view=core.
  const coreOnlyView = sp.view === "core";
  const includeGenerated = !coreOnlyView;
  const coreOnly = coreOnlyView
    ? {
        NOT: {
          OR: [{ slug: { startsWith: "q-" } }, { slug: { startsWith: "exp-" } }],
        },
      }
    : {};

  const codingWhere = { isPublished: true, type: "CODING_PROBLEM" as const, ...trackFilter, ...coreOnly };
  const projectWhere = {
    isPublished: true,
    type: { not: "CODING_PROBLEM" as const },
    ...trackFilter,
    ...coreOnly,
  };
  const [codingTotal, projectTotal, codingAllTotal, projectAllTotal, codingChallenges, projectChallenges, editorialMap, difficultyRows] =
    await Promise.all([
      prisma.challenge.count({ where: codingWhere }),
      prisma.challenge.count({ where: projectWhere }),
      prisma.challenge.count({
        where: { isPublished: true, type: "CODING_PROBLEM", ...trackFilter },
      }),
      prisma.challenge.count({
        where: { isPublished: true, type: { not: "CODING_PROBLEM" }, ...trackFilter },
      }),
      prisma.challenge.findMany({
        where: codingWhere,
        select: listSelect,
        // Frequency first — do not sort Easy-first or the seed looks like Medium/Hard are empty.
        orderBy: [{ frequency: "desc" }, { title: "asc" }],
        take: CODING_LIMIT,
      }),
      prisma.challenge.findMany({
        where: projectWhere,
        select: listSelect,
        orderBy: [{ frequency: "desc" }, { title: "asc" }],
        take: PROJECT_LIMIT,
      }),
      editorialSlugByChallengeSlug(),
      prisma.challenge.groupBy({
        by: ["difficulty"],
        where: codingWhere,
        _count: { _all: true },
      }),
    ]);

  const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0, Expert: 0, Impossible: 0 };
  for (const row of difficultyRows) {
    const d = row.difficulty;
    const n = row._count._all;
    if (d <= 3) difficultyCounts.Easy += n;
    else if (d <= 6) difficultyCounts.Medium += n;
    else if (d <= 8) difficultyCounts.Hard += n;
    else if (d === 9) difficultyCounts.Expert += n;
    else difficultyCounts.Impossible += n;
  }

  const challenges = [...codingChallenges, ...projectChallenges];

  const workspaceByAssessment = new Map<string, string>();
  if (user) {
    const assessmentIds = challenges.flatMap((c) => c.assessments.map((a) => a.id));
    if (assessmentIds.length) {
      const myAssignments = await prisma.assessmentAssignment.findMany({
        where: {
          candidateId: user.id,
          assessmentId: { in: assessmentIds },
        },
        select: { assessmentId: true, workspace: { select: { id: true } } },
      });
      for (const a of myAssignments) {
        if (a.workspace) workspaceByAssessment.set(a.assessmentId, a.workspace.id);
      }
    }
  }

  const rows = challenges.map((c) => {
    const assessment = c.assessments[0];
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      description: "",
      type: c.type,
      track: c.track,
      difficulty: c.difficulty,
      tags: c.tags,
      languages: c.languages,
      estimatedDays: c.estimatedDays,
      companies: c.companies,
      frequency: c.frequency,
      avgMinutes: c.avgMinutes,
      isPremium: c.isPremium,
      owaspMappings: c.owaspMappings,
      mitreMappings: c.mitreMappings,
      assessmentId: assessment?.id ?? null,
      workspaceId: assessment ? workspaceByAssessment.get(assessment.id) ?? null : null,
      editorialSlug: resolveEditorialSlug(c.slug, editorialMap),
    };
  });

  const problems = rows.filter((r) => isCodingProblem(r));
  const projects = rows.filter((r) => !isCodingProblem(r));
  const checkoutAvailable =
    stripeEnabled() || process.env.ALLOW_MOCK_BILLING === "true";
  const judge = getJudgeStatus();

  return (
    <div className="space-y-4">
      <SaveProgressCta guest={!user} />
      <JudgeBanner />
      <Problemset
        problems={problems}
        projects={projects}
        initialMode={sp.view === "projects" ? "projects" : "problemset"}
        premium={isPremium(user)}
        libraryTotals={{ coding: codingTotal, projects: projectTotal }}
        libraryAllTotals={{ coding: codingAllTotal, projects: projectAllTotal }}
        includeGenerated={includeGenerated}
        signedIn={Boolean(user)}
        checkoutAvailable={checkoutAvailable}
        judgeOnline={judge.online}
        difficultyCounts={difficultyCounts}
        trackFilter={sp.track && sp.track !== "generated" && sp.track !== "core" ? sp.track : null}
      />
    </div>
  );
}
