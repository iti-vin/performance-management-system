import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import type { ZodType } from "zod";

import { SESSION_COOKIE } from "@/features/auth/services/session-cookie";

/** What a page needs to know about a read, with no raw error or header in it. */
export type ApiReadResult<Data> =
  | { kind: "ok"; data: Data }
  | { kind: "signed_out" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable" };

type ApiResponse = { status: number; data: unknown } | null;

/** Reads with the session token, and accepts only a body that the schema accepts. */
export async function readApi<Data>(
  request: (accessToken: string) => Promise<ApiResponse> | ApiResponse,
  schema: ZodType<Data>,
): Promise<ApiReadResult<Data>> {
  const accessToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!accessToken) return { kind: "signed_out" };

  // The HTTP client reads the clock: mark the render as request-time first.
  await connection();

  try {
    const response = await request(accessToken);
    if (!response) return { kind: "unavailable" };
    if (response.status === 401) return { kind: "signed_out" };
    if (response.status === 403) return { kind: "forbidden" };
    if (response.status === 404) return { kind: "not_found" };

    const parsed = schema.safeParse(response.data);
    return parsed.success ? { kind: "ok", data: parsed.data } : { kind: "unavailable" };
  } catch {
    // Keep request headers out of the error.
    return { kind: "unavailable" };
  }
}
