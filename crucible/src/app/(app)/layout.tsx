import { getSessionUser } from "@/server/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null);
  return <AppShell user={user}>{children}</AppShell>;
}
