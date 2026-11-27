export interface LaunchConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
}

/** The words of the dialog before a schedule: the day, and what freezes (PRD Cyc-006). */
export function scheduleConfirmation(cycleName: string, assessmentStart: string): LaunchConfirmation {
  return {
    title: "Schedule this cycle?",
    description: `"${cycleName}" becomes Scheduled, and the system activates it on ${assessmentStart}, when it creates the assignments. The templates are frozen now. You can return it to draft before that day.`,
    confirmLabel: "Schedule Cycle",
  };
}

/**
 * The words of the dialog before a launch (PRD 6.11): the record by its name, and what cannot be
 * undone. The assignments exist after it, the templates are frozen, and the cycle can only be cancelled.
 */
export function launchConfirmation(cycleName: string, participantCount: number): LaunchConfirmation {
  const people = participantCount === 1 ? "1 participant" : `${participantCount} participants`;
  return {
    title: "Launch this cycle?",
    description: `Launching "${cycleName}" creates the assignments of ${people}. It becomes Active. The templates are frozen at their current versions, and the cycle cannot be edited afterwards, only cancelled. This cannot be undone.`,
    confirmLabel: "Launch Cycle",
  };
}
