import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/services/current-user";
import { ReviewList } from "@/features/review-cycles/components/review-list";
import { ReviewListNotice } from "@/features/review-cycles/components/review-list-notice";
import { getReviews } from "@/features/review-cycles/services/review-cycle-reader";
import {
  buildReviewListHref,
  parseReviewListParams,
  scopeReviewParams,
  type RawSearchParams,
} from "@/features/review-cycles/services/review-list-params";

/**
 * The body of All Reviews. The role only chooses the filters that the page offers: the API
 * decides which rows each account receives.
 */
export async function ReviewsContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [user, raw] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) return <ReviewListNotice kind="signed_out" />;

  const isAdmin = user.role === "ADMIN";
  const params = scopeReviewParams(parseReviewListParams(raw), user.role);
  const result = await getReviews(params);
  if (result.kind !== "ok") return <ReviewListNotice kind={result.kind} />;

  // A stale link, or rows that went away, can ask for a page past the end.
  const lastPage = Math.max(1, Math.ceil(result.data.totalItems / result.data.pageSize));
  if (params.page > lastPage) redirect(buildReviewListHref({ ...params, page: lastPage }));

  return <ReviewList page={result.data} params={params} isAdmin={isAdmin} isManager={user.role === "MANAGER"} />;
}
