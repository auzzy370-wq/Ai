import { COMPANIES } from "@/lib/saas";
import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { JobsClient } from "@/components/jobs/jobs-client";

export default async function JobsPage() {
  await requirePageRolesOrGuest("/jobs", [...CANDIDATE_ROLES, "SUPER_ADMIN", "HIRING_MANAGER", "TECHNICAL_REVIEWER"]);
  return <JobsClient companies={COMPANIES} />;
}
