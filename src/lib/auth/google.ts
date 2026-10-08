import { env } from 'cloudflare:workers';
import { logger } from '../log';
import { decodeTokenPayload } from './token';

const log = logger('auth.google');

export type GoogleProfile = { sub: string; email: string; name?: string; picture?: string };

export const googleConfigured = () => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const redirectUri = () => `${env.SITE_URL.replace(/\/$/, '')}/api/auth/callback`;

export function authorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(), response_type: 'code',
    scope: 'openid email profile', state, prompt: 'select_account'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Exchanges the authorization code and returns the verified profile. Throws on any mismatch. */
export async function profileFromCode(code: string): Promise<GoogleProfile> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(), grant_type: 'authorization_code'
    })
  });
  if (!response.ok) {
    log.warn('token exchange failed', { status: response.status, body: await response.text() });
    throw new Error('Google token exchange failed');
  }
  const { id_token } = (await response.json()) as { id_token?: string };
  if (!id_token) throw new Error('Google response had no id_token');
  // The token came straight from Google over TLS, so the payload can be trusted once the claims are checked.
  const claims = decodeTokenPayload(id_token);
  if (claims.aud !== env.GOOGLE_CLIENT_ID) throw new Error('id_token audience mismatch');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) throw new Error('id_token issuer mismatch');
  if (claims.exp * 1000 < Date.now()) throw new Error('id_token expired');
  if (!claims.email || claims.email_verified !== true) throw new Error('Google email is not verified');
  log.debug('google profile ok', { sub: claims.sub });
  return { sub: claims.sub, email: claims.email, name: claims.name, picture: claims.picture };
}
