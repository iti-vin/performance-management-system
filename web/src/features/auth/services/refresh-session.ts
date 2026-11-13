import "server-only";

import {
  authTokenResponseSchema,
  type AuthTokenResponseDto,
} from "@pms/shared-types";
import { postRefreshToken } from "@/features/auth/api/auth-requests";

/**
 * Exchanges a live access token for a new one (POST auth/refresh-token).
 * Returns null on any failure. The caller then keeps the current token, which
 * still works until it expires, so a failed refresh never breaks a page.
 */
export async function refreshAccessToken(
  accessToken: string,
): Promise<AuthTokenResponseDto | null> {
  try {
    const response = await postRefreshToken(accessToken);
    if (!response?.ok) return null;

    const token = authTokenResponseSchema.safeParse(await response.json());
    return token.success ? token.data : null;
  } catch {
    return null;
  }
}
