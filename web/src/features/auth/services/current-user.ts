import "server-only";

import { currentUserDtoSchema } from "@pms/shared-types";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { fetchCurrentUser } from "@/features/auth/api/auth-requests";
import { SESSION_COOKIE } from "./session-cookie";

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // The HTTP client reads the clock. Mark the render as request-time first,
  // or Next.js stops the prerender with a "blocking route" error.
  await connection();

  const response = await fetchCurrentUser(token)?.catch(() => {
    // Keep request headers out of the error sent to the workspace.
    throw new Error("The authentication service is unavailable.");
  });
  if (!response) throw new Error("The authentication service is not configured.");
  if (response.status === 401) return null;

  const user = currentUserDtoSchema.safeParse(response.data);
  if (!user.success)
    throw new Error("The authentication service returned an invalid response.");
  return user.data;
}
