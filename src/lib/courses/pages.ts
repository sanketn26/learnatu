import { render } from 'astro:content';
import type { Locale } from '../../i18n/locales';
import { isAuthor } from '../auth/roles';
import { loginUrl } from '../auth/session';
import type { User } from '../db/users';
import { isEnrolled } from '../db/enrollments';
import { completedLessons } from '../db/progress';
import { lessonAccess } from './access';
import { getCourse, getCourseAbout, getLessonEntry } from './catalog';

/**
 * Page-level loaders. Route files call these and act on the result:
 *   'redirect' in result → Astro.redirect(result.redirect)
 *   'notFound' in result → 404
 *   otherwise            → render the component with result
 * (Components can't redirect, so every access decision lives here and in access.ts.)
 */
type Failure = { redirect: string } | { notFound: true };
const NOT_FOUND = { notFound: true } as const;

export async function loadLanding(user: User | null, lang: Locale, slug: string) {
  const author = isAuthor(user);
  const course = await getCourse(slug, lang, { drafts: author });
  if (!course) return NOT_FOUND;
  const enrolled = author || (user ? await isEnrolled(user.id, course.slug) : false);
  const done = user && enrolled ? await completedLessons(user.id, course.slug) : new Set<string>();
  const aboutEntry = await getCourseAbout(course.slug);
  const About = aboutEntry ? (await render(aboutEntry)).Content : null;
  return { course, user, author, enrolled, done, About };
}

export async function loadLesson(user: User | null, lang: Locale, courseSlug: string, lessonSlug: string, pathname: string): Promise<Failure | {
  user: User | null; course: NonNullable<Awaited<ReturnType<typeof getCourse>>>; index: number; access: Extract<Awaited<ReturnType<typeof lessonAccess>>, { ok: true }>;
  Content: Awaited<ReturnType<typeof render>>['Content']; entry: NonNullable<Awaited<ReturnType<typeof getLessonEntry>>>; done: Set<string>;
}> {
  const course = await getCourse(courseSlug, lang, { drafts: isAuthor(user) });
  const index = course?.lessons.findIndex((lesson) => lesson.slug === lessonSlug) ?? -1;
  if (!course || index < 0) return NOT_FOUND;

  // Free courses are open to all; paid courses need a signed-in, enrolled user (or a preview lesson).
  const access = await lessonAccess(user, course, course.lessons[index]);
  if (!access.ok) {
    return { redirect: access.reason === 'login' ? loginUrl(pathname) : `/courses/${course.slug}/` };
  }
  const entry = await getLessonEntry(course.slug, lessonSlug, lang);
  if (!entry) return NOT_FOUND;
  const { Content } = await render(entry.entry);
  const done = user ? await completedLessons(user.id, course.slug) : new Set<string>();
  return { user, course, index, access, Content, entry, done };
}
