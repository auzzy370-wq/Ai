import { CANDIDATE_ROLES, STAFF_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { ResearchFrontierClient } from "@/components/competition/research-frontier-client";

export default async function ResearchFrontierPage() {
  await requirePageRoles([...CANDIDATE_ROLES, ...STAFF_ROLES]);
  return <ResearchFrontierClient />;
}
