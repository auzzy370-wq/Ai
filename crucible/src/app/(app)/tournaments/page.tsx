import { CANDIDATE_ROLES, STAFF_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { TournamentsClient } from "@/components/competition/tournaments-client";

export default async function TournamentsPage() {
  await requirePageRoles([...CANDIDATE_ROLES, ...STAFF_ROLES]);
  return <TournamentsClient />;
}
