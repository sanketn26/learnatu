import type { APIRoute } from 'astro';
import { profileFromCode } from '../../../lib/auth/google';
import { consumeLogin, startSession } from '../../../lib/auth/session';
import { upsertGoogleUser } from '../../../lib/db/users';
import { logger } from '../../../lib/log';
import { safeEqual } from '../../../lib/crypto';

export const prerender = false;
const log = logger('auth.callback');

/** Step 2: Google sends the browser back with ?code=…&state=…. */
export const GET: APIRoute = async ({ url, cookies, redirect, locals }) => {
  const { state, next } = consumeLogin(cookies);
  const code = url.searchParams.get('code');
  const returned = url.searchParams.get('state');
  if (url.searchParams.get('error') || !code || !state || !returned || !safeEqual(state, returned)) {
    log.warn('login rejected', { requestId: locals.requestId, googleError: url.searchParams.get('error'), hasState: !!state });
    return redirect('/login/?error=1', 302);
  }
  try {
    const user = await upsertGoogleUser(await profileFromCode(code));
    await startSession(cookies, url, user.id);
    log.info('login ok', { requestId: locals.requestId, userId: user.id });
    return redirect(next, 302);
  } catch (error) {
    log.error('login failed', error, { requestId: locals.requestId });
    return redirect('/login/?error=1', 302);
  }
};
