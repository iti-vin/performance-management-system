export interface ComponentChoice {
  usesGoals: boolean;
  usesBehavioral: boolean;
}

/**
 * The weights of the chosen components (PRD 6.6): half each, or the whole weight for one.
 * With none, both are zero, and the shared schema refuses the cycle.
 */
export function weightsOf({ usesGoals, usesBehavioral }: ComponentChoice) {
  const share = usesGoals && usesBehavioral ? 0.5 : 1;
  return { goalsWeight: usesGoals ? share : 0, behavioralWeight: usesBehavioral ? share : 0 };
}

/** The components of some weights as people read them: "Goals Performance 50%, Behavioral Performance 50%". */
export function describeComponents(goalsWeight: number, behavioralWeight: number): string[] {
  return [
    { name: "Goals Performance", weight: goalsWeight },
    { name: "Behavioral Performance", weight: behavioralWeight },
  ]
    .filter(({ weight }) => weight > 0)
    .map(({ name, weight }) => `${name} ${Math.round(weight * 100)}%`);
}
