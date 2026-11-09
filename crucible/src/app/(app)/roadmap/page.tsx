import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { RoadmapClient } from "@/components/learn/roadmap-client";

export default async function RoadmapPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/roadmap");
  return <RoadmapClient />;
}
