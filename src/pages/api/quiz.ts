import { authedApi, HttpError, json, readJson } from '../../lib/http';
import { isAuthor } from '../../lib/auth/roles';
import { getCourse } from '../../lib/courses/catalog';
import { lessonAccess } from '../../lib/courses/access';
import { recordQuizAttempt } from '../../lib/db/progress';
import { PREVIEW_COOKIE, previewVersionFor } from '../../lib/courses/preview';

export const prerender = false;

/** Records a quiz answer. Grading happens in the browser (answers ship with the lesson); this is for analytics and "quizzes passed". */
export const POST = authedApi(async ({ request, cookies }, user) => {
  const body = await readJson<{ course: string; lesson: string; quiz: string; correct: boolean }>(request);
  const author = isAuthor(user);
  const course = await getCourse(body.course, 'en', { drafts: author, previewVersion: author ? previewVersionFor(cookies.get(PREVIEW_COOKIE)?.value, body.course) : null });
  const lesson = course?.lessons.find((l) => l.slug === body.lesson);
  if (!course || !lesson || !/^q\d{1,3}$/.test(body.quiz)) throw new HttpError(400, 'Bad quiz reference');
  const access = await lessonAccess(user, course, lesson);
  if (!access.ok) throw new HttpError(403, 'No access to this lesson');
  if ((await recordQuizAttempt(user.id, course.slug, lesson.slug, body.quiz, !!body.correct)) === false) throw new HttpError(429, 'Too many answers, slow down');
  return json({ ok: true });
});
