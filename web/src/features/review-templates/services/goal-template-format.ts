/** The position text of a template, or a word for a company-wide template. */
export function formatPosition(position: string | null): string {
  return position ?? "No position";
}

/**
 * Select options for the position names that the API lists. The position a
 * template already has stays in the list, because the API accepts it unchanged
 * even when no employee holds it any more.
 */
export function toPositionOptions(
  names: readonly string[],
  current: string | null = null,
): { value: string; label: string }[] {
  const all = current && !names.includes(current) ? [...names, current] : names;
  return all.map((name) => ({ value: name, label: name }));
}
