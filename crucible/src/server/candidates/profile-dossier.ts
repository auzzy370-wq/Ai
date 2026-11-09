import { prisma } from "@/lib/db";
import { buildLearnerGameState } from "@/server/learning/gamification";
import { STUDY_PLANS } from "@/server/saas/study-plans";
import { ensureCandidateProfile, getCandidateDetail } from "@/server/candidates/service";
import { itemXp } from "@/server/learning/study-plan-game";

export type ProfileCompleteness = {
  score: number;
  filled: number;
  total: number;
  missing: { id: string; label: string; href: string }[];
};

export type ProfileDossier = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    githubLogin: string | null;
    plan: string;
    avatarUrl: string | null;
  };
  profile: Awaited<ReturnType<typeof getCandidateDetail>>;
  game: Awaited<ReturnType<typeof buildLearnerGameState>>;
  completeness: ProfileCompleteness;
  stats: {
    verifiedSkills: number;
    claimedSkills: number;
    portfolioSkills: number;
    humanReviewed: number;
    assessmentsScored: number;
    bestScore: number;
    studyEnrolled: number;
    studyCleared: number;
    campaignXp: number;
    resumes: number;
  };
  studyCampaigns: {
    slug: string;
    title: string;
    company?: string;
    percent: number;
    completedCount: number;
    totalCount: number;
    earnedXp: number;
    cleared: boolean;
  }[];
  recentAssessments: {
    id: string;
    title: string;
    track: string;
    status: string;
    overall: number | null;
    tier: string | null;
    updatedAt: string;
  }[];
};

function completenessFrom(profile: Awaited<ReturnType<typeof getCandidateDetail>>): ProfileCompleteness {
  const checks: { id: string; label: string; ok: boolean; href: string }[] = [
    { id: "headline", label: "Write a headline", ok: Boolean(profile.headline?.trim()), href: "#edit-identity" },
    { id: "bio", label: "Add a short bio", ok: Boolean(profile.bio?.trim()), href: "#edit-identity" },
    {
      id: "track",
      label: "Pick a preferred track",
      ok: Boolean(profile.preferredTrack),
      href: "#edit-identity",
    },
    {
      id: "link",
      label: "Add GitHub, portfolio, or LinkedIn",
      ok: Boolean(profile.githubUrl || profile.portfolioUrl || profile.linkedInUrl),
      href: "#edit-identity",
    },
    {
      id: "stack",
      label: "List languages or frameworks",
      ok: (profile.languages?.length ?? 0) + (profile.frameworks?.length ?? 0) > 0,
      href: "#edit-stack",
    },
    {
      id: "evidence",
      label: "Earn a verified skill (assessment or review)",
      ok: profile.skills.some((s) => s.source === "ASSESSMENT" || s.source === "HUMAN_REVIEW"),
      href: "/challenges",
    },
    {
      id: "public",
      label: "Publish your public qualification page",
      ok: Boolean(profile.publicEnabled && profile.publicSlug),
      href: "#edit-public",
    },
  ];
  const filled = checks.filter((c) => c.ok).length;
  const total = checks.length;
  return {
    score: Math.round((filled / total) * 100),
    filled,
    total,
    missing: checks.filter((c) => !c.ok).map(({ id, label, href }) => ({ id, label, href })),
  };
}

export async function buildProfileDossier(userId: string): Promise<ProfileDossier> {
  await ensureCandidateProfile(userId);
  const [user, profile, game, enrollments, assignments] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        githubLogin: true,
        plan: true,
        avatarUrl: true,
      },
    }),
    getCandidateDetail(userId),
    buildLearnerGameState(userId),
    prisma.studyPlanEnrollment.findMany({ where: { userId } }),
    prisma.assessmentAssignment.findMany({
      where: { candidateId: userId },
      include: {
        assessment: { select: { title: true, track: true } },
        scoreReport: { select: { overall: true, tier: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  const bySlug = new Map(enrollments.map((e) => [e.planSlug, e]));
  const studyCampaigns = STUDY_PLANS.filter((p) => bySlug.has(p.slug)).map((plan) => {
    const enr = bySlug.get(plan.slug)!;
    const completed = new Set(enr.completedSlugs);
    const completedCount = plan.challengeSlugs.filter((s) => completed.has(s)).length;
    const totalCount = plan.challengeSlugs.length;
    let earnedXp = 0;
    for (const slug of plan.challengeSlugs) {
      if (!completed.has(slug)) continue;
      earnedXp += itemXp({ itemKind: plan.itemKind, difficulty: 4 });
    }
    const cleared = totalCount > 0 && completedCount >= totalCount;
    return {
      slug: plan.slug,
      title: plan.title,
      company: plan.company,
      percent: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
      completedCount,
      totalCount,
      earnedXp,
      cleared,
    };
  });

  const scored = assignments.filter((a) => a.scoreReport);
  const bestScore = scored.reduce((m, a) => Math.max(m, a.scoreReport?.overall ?? 0), 0);

  return {
    user,
    profile,
    game,
    completeness: completenessFrom(profile),
    stats: {
      verifiedSkills: profile.skillBuckets.assessment.length + profile.skillBuckets.humanReview.length,
      claimedSkills: profile.skillBuckets.claimed.length,
      portfolioSkills: profile.skillBuckets.portfolio.length,
      humanReviewed: profile.skillBuckets.humanReview.length,
      assessmentsScored: scored.length,
      bestScore,
      studyEnrolled: studyCampaigns.length,
      studyCleared: studyCampaigns.filter((c) => c.cleared).length,
      campaignXp: studyCampaigns.reduce((s, c) => s + c.earnedXp, 0),
      resumes: profile.resumes.length,
    },
    studyCampaigns,
    recentAssessments: assignments.map((a) => ({
      id: a.id,
      title: a.assessment.title,
      track: a.assessment.track,
      status: a.status,
      overall: a.scoreReport?.overall ?? null,
      tier: a.scoreReport?.tier ?? null,
      updatedAt: a.updatedAt.toISOString(),
    })),
  };
}
