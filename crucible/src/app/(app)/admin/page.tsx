import { requirePageRoles } from "@/server/auth/page-guard";
import { AdminClient } from "@/components/admin/admin-client";

export default async function AdminPage() {
  await requirePageRoles(["SUPER_ADMIN"]);
  return <AdminClient />;
}
