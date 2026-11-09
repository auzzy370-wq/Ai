import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { AiCraftClient } from "@/components/learn/ai-craft-client";

export default async function AiCraftPage() {
  await requirePageRolesOrGuest("/learn/ai", CANDIDATE_ROLES);
  return <AiCraftClient />;
}
