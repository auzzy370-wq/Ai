import { CANDIDATE_ROLES, STAFF_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { AiVsHumanClient } from "@/components/competition/ai-vs-human-client";

export default async function AiVsHumanPage() {
  await requirePageRoles([...CANDIDATE_ROLES, ...STAFF_ROLES]);
  return <AiVsHumanClient />;
}
