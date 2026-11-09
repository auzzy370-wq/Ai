import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { InterviewCraftClient } from "@/components/learn/interview-craft-client";

export default async function InterviewCraftPage() {
  await requirePageRolesOrGuest("/learn/interview", CANDIDATE_ROLES);
  return <InterviewCraftClient />;
}
