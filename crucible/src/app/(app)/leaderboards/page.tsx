import { CANDIDATE_ROLES, STAFF_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { LeaderboardsClient } from "@/components/competition/leaderboards-client";

export default async function LeaderboardsPage() {
  await requirePageRoles([...CANDIDATE_ROLES, ...STAFF_ROLES]);
  return <LeaderboardsClient />;
}
