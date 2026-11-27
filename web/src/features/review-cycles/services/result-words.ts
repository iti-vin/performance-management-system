/** Two decimals, with a half rounded up: 4.505 is stored as 4.50499999..., and reads 4.51. */
const toTwoDecimals = (value: number) => (Math.round(Number((value * 100).toFixed(6))) / 100).toFixed(2);

/** A score as people read it. A score that cannot be computed is never zero. */
export function formatScore(score: number | null): string {
  return score === null ? "Not rated" : `${toTwoDecimals(score)} / 5`;
}

/** A weight fraction as a percentage. */
export function formatWeight(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}
