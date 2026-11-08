import { ANALYTICS_ROLES } from "@/lib/access";
import { requirePageRoles } from "@/server/auth/page-guard";
import { ReviewsClient } from "@/components/reviews/reviews-client";

export default async function ReviewsPage() {
  await requirePageRoles(ANALYTICS_ROLES);
  return <ReviewsClient />;
}
