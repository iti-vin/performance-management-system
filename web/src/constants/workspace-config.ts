/**
 * Values of the workspace header that have no data source yet. The role and
 * the account name come from GET auth/me. The department does not: the
 * employee record has no department column, so every user sees this default
 * until the backend returns one.
 */
export const WORKSPACE_CONFIG = {
  departmentName: "ITI HRDotNet",
} as const;
