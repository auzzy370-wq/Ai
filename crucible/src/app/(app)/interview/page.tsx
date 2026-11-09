import { prisma } from "@/lib/db";
import { isPremium } from "@/server/auth/session";
import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { InterviewClient } from "@/components/saas/interview-client";
import { FREE_MOCK_LIMIT } from "@/server/saas/interview-rounds";

export default async function InterviewPage() {
  const user = await requirePageRoles(CANDIDATE_ROLES);
  const premium = isPremium(user);

  const sims = await prisma.interviewSimulation.findMany({
    where: { userId: user.id },
    include: { challenge: { select: { title: true, slug: true, difficulty: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const totalUsed = await prisma.interviewSimulation.count({ where: { userId: user.id } });

  // Resolve resume workspace links for in-progress sims
  const challengeIds = [...new Set(sims.map((s) => s.challengeId))];
  const assessments = challengeIds.length
    ? await prisma.assessment.findMany({
        where: { challengeId: { in: challengeIds }, status: "PUBLISHED" },
        select: {
          id: true,
          challengeId: true,
          assignments: {
            where: { candidateId: user.id },
            select: { workspace: { select: { id: true } } },
            take: 1,
          },
        },
      })
    : [];
  const workspaceByChallenge = new Map<string, string | null>();
  for (const a of assessments) {
    const ws = a.assignments[0]?.workspace?.id ?? null;
    if (!workspaceByChallenge.has(a.challengeId) || ws) {
      workspaceByChallenge.set(a.challengeId, ws);
    }
  }

  return (
    <InterviewClient
      premium={premium}
      freeRemaining={premium ? 999 : Math.max(0, FREE_MOCK_LIMIT - totalUsed)}
      sims={sims.map((s) => ({
        id: s.id,
        company: s.company,
        role: s.role,
        status: s.status,
        timedMinutes: s.timedMinutes,
        createdAt: s.createdAt.toISOString(),
        challenge: s.challenge,
        workspaceId: workspaceByChallenge.get(s.challengeId) ?? null,
      }))}
    />
  );
}
