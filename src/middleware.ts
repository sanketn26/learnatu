import { defineMiddleware } from 'astro:middleware';
import { userFromCookies } from './lib/auth/session';
import { logger } from './lib/log';
import { detectLang, legacyLangPath, setLangCookie } from './lib/lang';

const log = logger('request');

/** Gives every server-rendered request a request id, the reader's language and a lazy, cached `getUser()`. */
export const onRequest = defineMiddleware(async (context, next) => {
  // Old language-prefixed URLs (/hi/courses/…) now live at the same address as every language: remember the language and drop the prefix.
  const legacy = legacyLangPath(context.url.pathname);
  if (legacy) {
    setLangCookie(context.cookies, legacy.lang);
    return context.redirect(`${legacy.rest}${context.url.search}`, 301);
  }
  if (context.isPrerendered) return next();
  context.locals.lang = detectLang(context.cookies, context.request.headers.get('accept-language'));
  const requestId = crypto.randomUUID().slice(0, 8);
  let user: ReturnType<typeof userFromCookies> | undefined;
  context.locals.requestId = requestId;
  context.locals.getUser = () => (user ??= userFromCookies(context.cookies));
  const started = Date.now();
  try {
    const response = await next();
    response.headers.append('Vary', 'Cookie, Accept-Language');
    log.debug(`${context.request.method} ${context.url.pathname}`, { requestId, status: response.status, ms: Date.now() - started });
    return response;
  } catch (error) {
    log.error(`${context.request.method} ${context.url.pathname} threw`, error, { requestId });
    throw error;
  }
});
