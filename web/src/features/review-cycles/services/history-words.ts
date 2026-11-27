import type { CycleHistoryEntryDto } from "@pms/shared-types";

import { ACCOMPLISHMENT_STATUS_LABELS, CYCLE_STATUS_LABELS, EVALUATION_STATUS_LABELS, REVIEW_TYPE_LABELS } from "@/constants/domain-labels";
import { formatWorkspaceDate, formatWorkspaceDateTimeShort } from "@/utils/workspace-date";

type Area = CycleHistoryEntryDto["area"];
type Change = NonNullable<CycleHistoryEntryDto["after"]>;
type Words = Readonly<Record<string, string>>;

/** The words of a state or status code: each kind of record has its own. */
const STATE_WORDS: Record<Area, Words> = {
  cycle: CYCLE_STATUS_LABELS,
  review: EVALUATION_STATUS_LABELS,
  report: ACCOMPLISHMENT_STATUS_LABELS,
};

/** "releasedAt" reads "Released at". */
const nameWords = (key: string) => {
  const spaced = key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
};

function valueWords(area: Area, key: string, value: Change[string]): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (key === "state" || key === "status") return STATE_WORDS[area][value] ?? value;
  if (key === "reviewType") return (REVIEW_TYPE_LABELS as Words)[value] ?? value;
  // A stored time reads in the time of the workspace. A stored day stays a day.
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatWorkspaceDateTimeShort(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatWorkspaceDate(value) : value;
}

/** The values of a stored change as people read them. */
export function changeWords(area: Area, change: Change): string {
  return Object.entries(change)
    .map(([key, value]) => `${nameWords(key)}: ${valueWords(area, key, value)}`)
    .join(", ");
}
