import type { APIContext } from 'astro';
import type { User } from './db/users';
import { errorFields, logger } from './log';

const log = logger('api');

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

/** Thrown inside a handler to produce a clean JSON error response. */
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Handler = (context: APIContext) => Promise<Response>;
type AuthedHandler = (context: APIContext, user: User) => Promise<Response>;

/** Wraps an API handler: logs failures with the request id, turns HttpError into JSON. */
export function api(handler: Handler): Handler {
  return async (context) => {
    try {
      return await handler(context);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      log.error(`${context.request.method} ${context.url.pathname} failed`, error, { requestId: context.locals.requestId });
      return json({ error: 'Something went wrong', requestId: context.locals.requestId }, 500);
    }
  };
}

/** Like `api`, but requires a signed-in user (401 otherwise). */
export const authedApi = (handler: AuthedHandler): Handler => api(async (context) => {
  const user = await context.locals.getUser();
  if (!user) throw new HttpError(401, 'Sign in required');
  return handler(context, user);
});

export async function readJson<T>(request: Request): Promise<T> {
  try { return (await request.json()) as T; } catch { throw new HttpError(400, 'Invalid JSON body'); }
}

export { errorFields };
