import { notFound } from "next/navigation";

import { AccomplishmentRecord, type AccomplishmentRecordProps } from "@/features/position-goals/components/accomplishment-record";
import { GoalsNotice } from "@/features/position-goals/components/goals-notice";
import { getAccomplishment } from "@/features/position-goals/services/accomplishment-reader";
import {
  decideAccomplishment,
  saveAccomplishment,
  submitAccomplishment,
} from "@/features/position-goals/services/accomplishment-response";

export interface RecordContentProps {
  params: Promise<{ "accomplishment-id": string }>;
  /** Set on the Goals entry of an employee: their reports, one for each cycle. */
  choices?: AccomplishmentRecordProps["choices"];
}

/** One KPI report with its actions. The API decides what the caller may read and do. */
export async function RecordContent({ params, choices }: RecordContentProps) {
  const { "accomplishment-id": accomplishmentId } = await params;
  const result = await getAccomplishment(accomplishmentId);
  if (result.kind === "not_found") notFound();
  if (result.kind !== "ok") return <GoalsNotice kind={result.kind} />;

  return (
    <AccomplishmentRecord
      key={accomplishmentId}
      detail={result.data}
      choices={choices}
      onSave={saveAccomplishment.bind(null, accomplishmentId)}
      onSubmit={submitAccomplishment.bind(null, accomplishmentId)}
      onDecide={decideAccomplishment.bind(null, accomplishmentId)}
    />
  );
}
