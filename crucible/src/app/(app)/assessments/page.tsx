import { prisma } from "@/lib/db";
import { requirePageRoles } from "@/server/auth/page-guard";
import { AssessmentsClient } from "@/components/assessment/assessments-client";

export default async function AssessmentsPage() {
  const user = await requirePageRoles([
    "SUPER_ADMIN",
    "HIRING_MANAGER",
    "TECHNICAL_REVIEWER",
    "CANDIDATE",
    "TEAM_MEMBER",
  ]);
  const isCandidate = user.role === "CANDIDATE" || user.role === "TEAM_MEMBER";

  // Do not hydrate the full seeded library (5k+ assessments) into the page —
  // keep every challenge available via a lean picker, but only list active / owned assessments.
  const [assessments, challenges, challengeTotal, candidates, assignments] = await Promise.all([
    prisma.assessment.findMany({
      where: {
        OR: [
          { assignments: { some: isCandidate && user ? { candidateId: user.id } : {} } },
          ...(user ? [{ createdById: user.id }] : []),
        ],
      },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            track: true,
            slug: true,
            summary: true,
            difficulty: true,
            tags: true,
            publicRequirements: true,
          },
        },
        _count: { select: { assignments: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.challenge.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        track: true,
        slug: true,
        summary: true,
        difficulty: true,
        tags: true,
        publicRequirements: true,
      },
      orderBy: [{ track: "asc" }, { difficulty: "asc" }, { title: "asc" }],
      take: 80,
    }),
    prisma.challenge.count({ where: { isPublished: true } }),
    prisma.user.findMany({
      where: { role: { in: ["CANDIDATE", "TEAM_MEMBER"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.assessmentAssignment.findMany({
      where: isCandidate && user ? { candidateId: user.id } : undefined,
      include: {
        assessment: {
          include: {
            challenge: {
              select: {
                summary: true,
                title: true,
                difficulty: true,
                tags: true,
                publicRequirements: true,
                adaptiveTrack: true,
              },
            },
          },
        },
        candidate: { select: { id: true, name: true, email: true } },
        workspace: { select: { id: true } },
        scoreReport: { select: { overall: true, qualified: true, tier: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const serializeChallenge = (c: (typeof challenges)[number] | (typeof assessments)[number]["challenge"]) => ({
    id: c.id,
    title: c.title,
    track: c.track,
    slug: c.slug,
    summary: "summary" in c ? c.summary : undefined,
    difficulty: "difficulty" in c ? c.difficulty : undefined,
    tags: "tags" in c ? c.tags : undefined,
    publicRequirements: ("publicRequirements" in c ? (c.publicRequirements as string[] | null) : null) ?? [],
  });

  return (
    <AssessmentsClient
      role={user!.role}
      assessments={assessments.map((a) => ({
        ...a,
        challenge: serializeChallenge(a.challenge),
      }))}
      challenges={challenges.map(serializeChallenge)}
      challengeTotal={challengeTotal}
      candidates={candidates}
      assignments={assignments.map((a) => ({
        ...a,
        assessment: {
          ...a.assessment,
          challenge: {
            summary: a.assessment.challenge.summary,
            title: a.assessment.challenge.title,
            difficulty: a.assessment.challenge.difficulty,
            tags: a.assessment.challenge.tags,
            publicRequirements: (a.assessment.challenge.publicRequirements as string[] | null) ?? [],
            adaptiveTrack: a.assessment.challenge.adaptiveTrack as { level: number; title: string }[] | null,
          },
        },
      }))}
    />
  );
}
