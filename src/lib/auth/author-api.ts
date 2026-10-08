import { authedApi, HttpError } from '../http';
import { isAuthor } from './roles';

/** Like `authedApi`, but only for authors (the emails in ADMIN_EMAILS). Everyone else gets a plain 404, so the route is not advertised. */
export const authorApi = (handler: Parameters<typeof authedApi>[0]) => authedApi(async (context, user) => {
  if (!isAuthor(user)) throw new HttpError(404, 'Not found');
  return handler(context, user);
});
