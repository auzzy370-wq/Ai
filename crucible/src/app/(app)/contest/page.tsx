import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { ContestClient } from "@/components/saas/contest-client";

export default async function ContestPage() {
  await requirePageRoles(CANDIDATE_ROLES);
  return <ContestClient />;
}
