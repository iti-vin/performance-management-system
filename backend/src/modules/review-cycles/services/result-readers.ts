/** Who reads the reviews and results of a cycle, beside the evaluator and HR. */
export interface Readers {
  employeeVisible: boolean;
  managerVisible: boolean;
  /** The reviewer of a later manager or HR stage reads the submitted answers of an earlier one. */
  earlierAnswersVisible: boolean;
}

/**
 * A cycle with no stored choice: the employee and the manager read what the release opens, and
 * earlier answers stay closed, so no running review opens by itself.
 */
export const UNCHOSEN: Readers = { employeeVisible: true, managerVisible: true, earlierAnswersVisible: false };

/** The new choice over the stored one: a value that is left out changes nothing. */
export function readersOf(chosen: Partial<Readers>, stored: Readers | null): Readers {
  const current = stored ?? UNCHOSEN;
  return {
    employeeVisible: chosen.employeeVisible ?? current.employeeVisible,
    managerVisible: chosen.managerVisible ?? current.managerVisible,
    earlierAnswersVisible: chosen.earlierAnswersVisible ?? current.earlierAnswersVisible,
  };
}

/** Whether the employee, or the current manager of the employee, reads what a release opens (Res-003). */
export function readsAfterRelease({
  actorId,
  employeeId,
  team,
  readers,
}: {
  actorId: string | null;
  employeeId: string;
  team: ReadonlySet<string>;
  readers: Readers;
}): boolean {
  if (employeeId === actorId) return readers.employeeVisible;
  return readers.managerVisible && team.has(employeeId);
}
