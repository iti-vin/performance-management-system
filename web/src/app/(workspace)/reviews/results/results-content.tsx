import { ResultsTable } from "@/features/review-cycles/components/results-table";
import { ReviewListNotice } from "@/features/review-cycles/components/review-list-notice";
import { getResults } from "@/features/review-cycles/services/result-reader";

/** The results that the API gives the caller: their own, their team's, or the company's. */
export async function ResultsContent() {
  const result = await getResults();
  if (result.kind !== "ok") return <ReviewListNotice kind={result.kind} />;
  return <ResultsTable caption="Results" rows={result.data} context="cycle" emptyMessage="No result is released to you yet." />;
}
