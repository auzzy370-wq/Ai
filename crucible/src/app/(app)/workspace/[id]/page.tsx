import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, canReview, isPremium } from "@/server/auth/session";
import { WorkspaceIde } from "@/components/workspace/ide";
import { isCodingProblem } from "@/server/challenges/coding-problems";
import { getJudgeStatus } from "@/server/execution/judge-status";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      files: { orderBy: { path: "asc" } },
      commits: { orderBy: { createdAt: "desc" }, take: 20 },
      jobs: { orderBy: { createdAt: "desc" }, take: 12 },
      assignment: { include: { assessment: { include: { challenge: true } } } },
    },
  });
  if (!workspace) notFound();
  const pairGuest = await prisma.pairSession.findFirst({
    where: {
      workspaceId: workspace.id,
      guestId: user.id,
      status: { in: ["WAITING", "LIVE"] },
    },
  });
  if (workspace.assignment.candidateId !== user.id && !canReview(user.role) && !pairGuest) {
    notFound();
  }

  const challenge = workspace.assignment.assessment.challenge;
  const codingMode = isCodingProblem(challenge);
  const premium = isPremium(user);
  const adaptiveTrack =
    (challenge.adaptiveTrack as { level: number; title: string; criteria: string }[] | null) ?? [];
  const gradingRubric = (challenge.gradingRubric as Record<string, string> | null) ?? {};
  const publicRequirements = (challenge.publicRequirements as string[] | null) ?? [];
  const hiddenRequirements = (challenge.hiddenRequirements as string[] | null) ?? [];

  const judge = getJudgeStatus();

  return (
    <WorkspaceIde
      workspaceId={workspace.id}
      assignmentId={workspace.assignmentId}
      title={workspace.assignment.assessment.title}
      track={workspace.assignment.assessment.track}
      language={workspace.language}
      judgeOnline={judge.online}
      judgeDetail={judge.detail}
      files={workspace.files}
      commits={workspace.commits.map((c) => ({
        sha: c.sha,
        message: c.message,
        createdAt: c.createdAt.toISOString(),
      }))}
      jobs={workspace.jobs}
      role={user!.role}
      timedMinutes={workspace.assignment.assessment.timedMinutes}
      dueAt={workspace.assignment.dueAt?.toISOString() ?? null}
      startedAt={workspace.assignment.startedAt?.toISOString() ?? null}
      codingMode={codingMode}
      challengeSlug={challenge.slug}
      challengeId={challenge.id}
      difficulty={challenge.difficulty}
      tags={challenge.tags}
      problemDescription={challenge.description}
      problemSummary={challenge.summary}
      premium={premium}
      companies={challenge.companies}
      isPremiumContent={challenge.isPremium}
      publicRequirements={publicRequirements}
      hiddenRequirements={hiddenRequirements}
      adaptiveTrack={adaptiveTrack}
      gradingRubric={gradingRubric}
      currentLevel={workspace.assignment.currentLevel}
      maxLevelReached={workspace.assignment.maxLevelReached}
      owaspMappings={challenge.owaspMappings ?? undefined}
      mitreMappings={challenge.mitreMappings ?? undefined}
    />
  );
}
