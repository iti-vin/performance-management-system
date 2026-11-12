/** The claims inside an access token. */
export interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  type: string;
}
