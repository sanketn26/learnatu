import { authedApi, HttpError, json, readJson } from '../../lib/http';
import { isAuthor } from '../../lib/auth/roles';
import { getCourse } from '../../lib/courses/catalog';
import { lessonAccess } from '../../lib/courses/access';
import { setLessonComplete } from '../../lib/db/progress';
import { PREVIEW_COOKIE, previewVersionFor } from '../../lib/courses/preview';

export const prerender = false;

export const POST = authedApi(async ({ request, cookies }, user) => {
  const { course: slug, lesson: lessonSlug, complete } = await readJson<{ course: string; lesson: string; complete: boolean }>(request);
  const author = isAuthor(user);
  const course = await getCourse(slug, 'en', { drafts: author, previewVersion: author ? previewVersionFor(cookies.get(PREVIEW_COOKIE)?.value, slug) : null });
  const lesson = course?.lessons.find((l) => l.slug === lessonSlug);
  if (!course || !lesson) throw new HttpError(404, 'Unknown lesson');
  const access = await lessonAccess(user, course, lesson);
  if (!access.ok) throw new HttpError(403, 'No access to this lesson');
  await setLessonComplete(user.id, course.slug, lesson.slug, !!complete);
  return json({ ok: true });
});
