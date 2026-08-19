/** Local, unverified decode — server-side verification is authoritative; this only reads claims for client bookkeeping (user id, expiry). */
export interface AccessTokenClaims {
  sub: string;
  username: string;
  exp: number;
}

export function decodeAccessToken(token: string): AccessTokenClaims {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('Malformed JWT: missing payload segment');
  }
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  const json = atob(base64);
  const claims = JSON.parse(json) as Partial<AccessTokenClaims>;
  if (!claims.sub || !claims.username || !claims.exp) {
    throw new Error('Malformed JWT: missing required claims');
  }
  return { sub: claims.sub, username: claims.username, exp: claims.exp };
}
