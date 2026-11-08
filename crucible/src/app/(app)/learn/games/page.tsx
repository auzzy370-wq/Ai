import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { prisma } from "@/lib/db";
import { ARCADE_PLAN_SLUG } from "@/server/learning/arcade-games";
import { ArcadeLobby } from "@/components/learn/games/arcade-lobby";

export default async function LearnGamesPage() {
  const user = await requirePageRolesOrGuest("/learn/games", CANDIDATE_ROLES);
  const enrollment = user
    ? await prisma.studyPlanEnrollment.findUnique({
        where: { userId_planSlug: { userId: user.id, planSlug: ARCADE_PLAN_SLUG } },
      })
    : null;

  return <ArcadeLobby completedSlugs={enrollment?.completedSlugs ?? []} />;
}
