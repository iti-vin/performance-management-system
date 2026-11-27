/** The workspace shows dates in Manila time, as `layouts/workspace-clock.tsx` does. */
const WORKSPACE_TIME_ZONE = "Asia/Manila";

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: WORKSPACE_TIME_ZONE,
});

/** An ISO timestamp as a workspace-time date, or "Not set" for null. */
export function formatWorkspaceDate(value: string | null): string {
  return value ? DATE_FORMAT.format(new Date(value)) : "Not set";
}

export function formatWorkspaceDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-PH", { timeZone: WORKSPACE_TIME_ZONE }) : "Not set";
}

export function formatWorkspaceDateTimeShort(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-PH", { timeZone: WORKSPACE_TIME_ZONE, dateStyle: "short", timeStyle: "short" }) : "Not set";
}

export function formatWorkspaceDateTimeLong(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-PH", { timeZone: WORKSPACE_TIME_ZONE, dateStyle: "long", timeStyle: "long" }) : "Not set";
}

export function formatWorkspaceDateTimeWithSeconds(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-PH", { timeZone: WORKSPACE_TIME_ZONE, dateStyle: "medium", timeStyle: "medium" }) : "Not set";
}

export function formatWorkspaceDateTimeWithMilliseconds(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-PH", { timeZone: WORKSPACE_TIME_ZONE, dateStyle: "medium", timeStyle: "medium", fractionalSecondDigits: 3 }) : "Not set";
}

export function formatWorkspaceDateTimeWithTimezone(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-PH", { timeZone: WORKSPACE_TIME_ZONE, dateStyle: "medium", timeStyle: "medium", timeZoneName: "short" }) : "Not set";
}