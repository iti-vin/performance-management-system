import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/molecules/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ResultDetails } from "@/features/review-cycles/components/result-details";
import { ReviewListNotice } from "@/features/review-cycles/components/review-list-notice";
import { getResult } from "@/features/review-cycles/services/result-reader";

export const RESULT_TITLE = "Employee Evaluation Results";

export interface ResultContentProps {
  params: Promise<{ "participant-id": string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** One result. The API decides who may read it. */
export async function ResultContent({ params, searchParams }: ResultContentProps) {
  const [{ "participant-id": participantId }, search] = await Promise.all([params, searchParams]);
  const result = await getResult(participantId);
  if (result.kind === "not_found") notFound();
  if (result.kind !== "ok") {
    return (
      <>
        <PageHeader title={RESULT_TITLE} />
        <ReviewListNotice kind={result.kind} />
      </>
    );
  }

  const { cycleId, cycleName, employeeName } = result.data;
  // The way back is built here, never taken from the URL as an address.
  const back =
    search.from === "cycle"
      ? { href: `/review-cycles/${cycleId}?tab=results`, words: "Back to Cycle" }
      : { href: "/reviews/results", words: "Back to Results" };

  return (
    <>
      <PageHeader title={RESULT_TITLE} description={`${employeeName} · ${cycleName}`} />
      <Link href={back.href} className={buttonVariants({ variant: "ghost", className: "min-h-pms-touch w-fit text-muted-foreground" })}>
        <ChevronLeftIcon aria-hidden="true" />
        {back.words}
      </Link>
      <ResultDetails result={result.data} />
    </>
  );
}
