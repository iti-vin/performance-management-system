/** Who may read released results, beside HR: the wizard and the release offer the same choices. */
export const RESULT_READERS = [
  { field: "employeeVisible", label: "Employees read their own result" },
  { field: "managerVisible", label: "Managers read the results of their team" },
] as const;

/** What the wizard offers: the readers of the results, and whether later reviewers read earlier answers (D5). */
export const CYCLE_READERS = [...RESULT_READERS, { field: "earlierAnswersVisible", label: "Reviewers read the answers of earlier stages" }] as const;
