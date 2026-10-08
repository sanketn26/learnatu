import type { AstroCookies } from 'astro';
import { randomToken } from '../crypto';
import { createSession, deleteSession, findUserBySession, SESSION_TTL_SECONDS } from '../db/sessions';
import type { User } from '../db/users';
import { safeLocalPath } from '../paths';

export const SESSION_COOKIE = 'learnatu_session';
const NEXT_COOKIE = 'learnatu_next';
const STATE_COOKIE = 'learnatu_oauth_state';

const baseOptions = (url: URL) => ({ path: '/', httpOnly: true, sameSite: 'lax' as const, secure: url.protocol === 'https:' });

export async function startSession(cookies: AstroCookies, url: URL, userId: string) {
  const token = randomToken();
  await createSession(userId, token);
  cookies.set(SESSION_COOKIE, token, { ...baseOptions(url), maxAge: SESSION_TTL_SECONDS });
}

export async function userFromCookies(cookies: AstroCookies): Promise<User | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  return token ? findUserBySession(token) : null;
}

export async function endSession(cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Only same-site relative paths are allowed as post-login destinations. */
export const safeNext = (value: string | null | undefined) => safeLocalPath(value, '/dashboard/');

export function rememberLogin(cookies: AstroCookies, url: URL, state: string, next: string) {
  const options = { ...baseOptions(url), maxAge: 600 };
  cookies.set(STATE_COOKIE, state, options);
  cookies.set(NEXT_COOKIE, next, options);
}

export function consumeLogin(cookies: AstroCookies) {
  const state = cookies.get(STATE_COOKIE)?.value;
  const next = safeNext(cookies.get(NEXT_COOKIE)?.value);
  cookies.delete(STATE_COOKIE, { path: '/' });
  cookies.delete(NEXT_COOKIE, { path: '/' });
  return { state, next };
}

export const loginUrl = (next: string) => `/login/?next=${encodeURIComponent(next)}`;
