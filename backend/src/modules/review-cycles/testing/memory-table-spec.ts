/**
 * A table in memory for the service specs. The name ends in `spec.ts`, so the build leaves it
 * out, and has no `.spec.ts`, so the test runner does not read it as a suite.
 */
export type Row = Record<string, unknown>;

export interface Query {
  where?: Row;
  order?: Record<string, 'ASC' | 'DESC'>;
  lock?: { mode: string };
}

/** Matches a row against a TypeORM `where` of equal values, `In(...)`, and `LessThanOrEqual(...)`. */
function matches(row: Row, where: Row = {}) {
  return Object.entries(where).every(([key, expected]) => {
    const operator = expected as { type?: string; value?: unknown };
    if (!operator || typeof operator !== 'object') return row[key] === expected;
    if (operator.type === 'lessThanOrEqual') return String(row[key]) <= String(operator.value);
    return Array.isArray(operator.value) ? operator.value.includes(row[key]) : row[key] === expected;
  });
}

function sorted(found: Row[], order: Query['order'] = {}) {
  return [...found].sort((a, b) => {
    for (const [column, direction] of Object.entries(order)) {
      const [left, right] = [a[column] as number | string, b[column] as number | string];
      if (left !== right) return (left < right ? -1 : 1) * (direction === 'ASC' ? 1 : -1);
    }
    return 0;
  });
}

/** Answers queries from its rows, and a save replaces the row with the same key. */
export function table(key: string, rows: Row[]) {
  return {
    rows,
    find: vi.fn(async (query: Query = {}) => sorted(rows.filter((row) => matches(row, query.where)), query.order).map((row) => ({ ...row }))),
    findOne: vi.fn(async (query: Query) => {
      const found = sorted(rows.filter((row) => matches(row, query.where)), query.order)[0];
      return found ? { ...found } : null;
    }),
    create: vi.fn((data: Row) => ({ ...data })),
    save: vi.fn(async (input: Row | Row[]) => {
      for (const row of Array.isArray(input) ? input : [input]) {
        const index = rows.findIndex((existing) => existing[key] === row[key]);
        if (index < 0) rows.push({ ...row });
        else rows[index] = { ...row };
      }
      return input;
    }),
  };
}
