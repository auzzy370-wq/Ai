import { CANDIDATE_ROLES, STAFF_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { BenchmarksClient } from "@/components/competition/benchmarks-client";

export default async function BenchmarksPage() {
  await requirePageRoles([...CANDIDATE_ROLES, ...STAFF_ROLES]);
  return <BenchmarksClient />;
}
