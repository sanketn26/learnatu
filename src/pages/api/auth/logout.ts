import type { APIRoute } from 'astro';
import { endSession } from '../../../lib/auth/session';
import { deleteUserSessions } from '../../../lib/db/sessions';

export const prerender = false;

/** Signs out this browser; with `all=1` in the form it signs out every device. */
export const POST: APIRoute = async ({ cookies, redirect, request, locals }) => {
  const all = (await request.formData().catch(() => null))?.get('all') === '1';
  const user = all ? await locals.getUser() : null;
  if (user) await deleteUserSessions(user.id);
  await endSession(cookies);
  return redirect('/', 303);
};
