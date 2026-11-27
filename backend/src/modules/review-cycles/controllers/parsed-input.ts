import { BadRequestException } from '@nestjs/common';

/** What `parsed` needs of a Zod schema. */
interface Schema<Output> {
  safeParse(input: unknown):
    | { success: true; data: Output }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}

/** The input parsed by its shared schema, or 400 with the field of each problem. */
export function parsed<Output>(schema: Schema<Output>, input: unknown, source: 'query' | 'body'): Output {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new BadRequestException({
    message: 'The request contains invalid fields.',
    details: result.error.issues.map((issue) => ({
      // A problem with no path, such as an unknown key, is a problem of the input itself.
      field: issue.path.join('.') || source,
      code: source === 'query' ? 'INVALID_QUERY' : 'INVALID_BODY',
      message: issue.message,
    })),
  });
}
