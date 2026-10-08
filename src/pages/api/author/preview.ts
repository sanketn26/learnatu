import type { APIRoute } from 'astro';
import { isAuthor } from '../../../lib/auth/roles';
import { getVersion } from '../../../lib/db/course-versions';
import { PREVIEW_COOKIE, previewCookieValue } from '../../../lib/courses/preview';

export const prerender = false;

/** Start (`?course=x&version=id`) or stop (`?exit=1&course=x`) previewing an uploaded version as a learner would see it. */
export const GET: APIRoute = async ({ url, cookies, redirect, locals, request }) => {
  // This changes a cookie, so a link on another website must not trigger it. (Our own links are same-origin or typed.)
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new Response('Not found', { status: 404 });
  if (!isAuthor(await locals.getUser())) return new Response('Not found', { status: 404 });
  const course = url.searchParams.get('course') ?? '';
  if (url.searchParams.has('exit')) {
    cookies.delete(PREVIEW_COOKIE, { path: '/' });
    return redirect('/author/upload/', 303);
  }
  const version = await getVersion(url.searchParams.get('version') ?? '');
  if (!version || version.course !== course) return new Response('Unknown version', { status: 404 });
  cookies.set(PREVIEW_COOKIE, previewCookieValue(course, version.id), { path: '/', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 60 * 60 * 8 });
  return redirect(`/courses/${course}/`, 303);
};
