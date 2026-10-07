import type { APIRoute } from 'astro';
import { authorizeUrl, googleConfigured } from '../../../lib/auth/google';
import { rememberLogin, safeNext } from '../../../lib/auth/session';
import { randomToken } from '../../../lib/crypto';

export const prerender = false;

/** Step 1: send the browser to Google. */
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  if (!googleConfigured()) return new Response('Google login is not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).', { status: 503 });
  const state = randomToken(16);
  rememberLogin(cookies, url, state, safeNext(url.searchParams.get('next')));
  return redirect(authorizeUrl(state), 302);
};
