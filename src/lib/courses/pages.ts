import { isAuthor } from '../auth/roles';
import { loginUrl } from '../auth/session';
import type { Locale } from '../../i18n/locales';
import type { User } from '../db/users';
import { isEnrolled } from '../db/enrollments';
import { completedLessons } from '../db/progress';
import { lessonAccess } from './access';
import { getCourse, getCourseAbout, getLessonContent, type Course, type LessonContent } from './catalog';

/**
 * Page-level loaders. Route files call these and act on the result:
 *   'redirect' in result → Astro.redirect(result.redirect)
 *   'notFound' in result → 404
 *   otherwise            → render the component with result
 * (Components can't redirect, so every access decision lives here and in access.ts.)
 *
 * `preview` is the uploaded version an author chose to preview (see preview.ts); it is ignored for everyone else.
 */
type Failure = { redirect: string } | { notFound: true };
const NOT_FOUND = { notFound: true } as const;

export async function loadLanding(user: User | null, lang: Locale, slug: string, preview: string | null = null) {
  const author = isAuthor(user);
  const course = await getCourse(slug, lang, { drafts: author, previewVersion: author ? preview : null });
  if (!course) return NOT_FOUND;
  const previewing = author && !!preview && course.versionId === preview;
  const enrolled = author || (user ? await isEnrolled(user.id, course.slug) : false);
  const done = user && enrolled ? await completedLessons(user.id, course.slug) : new Set<string>();
  const about = await getCourseAbout(course);
  return { course, user, author, previewing, enrolled, done, about };
}

export async function loadLesson(user: User | null, lang: Locale, courseSlug: string, lessonSlug: string, pathname: string, preview: string | null = null): Promise<Failure | {
  user: User | null; course: Course; index: number; previewing: boolean; access: Extract<Awaited<ReturnType<typeof lessonAccess>>, { ok: true }>;
  lesson: LessonContent; done: Set<string>;
}> {
  const author = isAuthor(user);
  const course = await getCourse(courseSlug, lang, { drafts: author, previewVersion: author ? preview : null });
  const index = course?.lessons.findIndex((lesson) => lesson.slug === lessonSlug) ?? -1;
  if (!course || index < 0) return NOT_FOUND;
  const previewing = author && !!preview && course.versionId === preview;

  // Free courses are open to all; paid courses need a signed-in, enrolled user (or a preview lesson).
  const access = await lessonAccess(user, course, course.lessons[index]);
  if (!access.ok) {
    return { redirect: access.reason === 'login' ? loginUrl(pathname) : `/courses/${course.slug}/` };
  }
  const lesson = await getLessonContent(course, lessonSlug, lang);
  if (!lesson) return NOT_FOUND;
  const done = user ? await completedLessons(user.id, course.slug) : new Set<string>();
  return { user, course, index, previewing, access, lesson, done };
}
