import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { WeeklyClient } from "@/components/saas/weekly-client";

export default async function WeeklyPage() {
  await requirePageRoles(CANDIDATE_ROLES);
  return <WeeklyClient />;
}
