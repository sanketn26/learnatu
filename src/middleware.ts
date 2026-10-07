import { defineMiddleware } from 'astro:middleware';
import { userFromCookies } from './lib/auth/session';
import { logger } from './lib/log';

const log = logger('request');

/** Gives every server-rendered request a request id and a lazy, cached `getUser()`. */
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) return next();
  const requestId = crypto.randomUUID().slice(0, 8);
  let user: ReturnType<typeof userFromCookies> | undefined;
  context.locals.requestId = requestId;
  context.locals.getUser = () => (user ??= userFromCookies(context.cookies));
  const started = Date.now();
  try {
    const response = await next();
    log.debug(`${context.request.method} ${context.url.pathname}`, { requestId, status: response.status, ms: Date.now() - started });
    return response;
  } catch (error) {
    log.error(`${context.request.method} ${context.url.pathname} threw`, error, { requestId });
    throw error;
  }
});
