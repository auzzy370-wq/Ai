import { requirePageRoles } from "@/server/auth/page-guard";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const user = await requirePageRoles();
  return <SettingsClient role={user.role} />;
}
