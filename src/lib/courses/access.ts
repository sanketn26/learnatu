import { isAuthor } from '../auth/roles';
import type { User } from '../db/users';
import { isEnrolled } from '../db/enrollments';
import type { Course, LessonRef } from './catalog';

export type Access =
  | { ok: true; enrolled: boolean; author?: boolean }
  | { ok: false; reason: 'login' | 'enroll' };

/**
 * The one place that decides who may read a lesson.
 *  - free courses are open to everyone (progress is only saved for signed-in, enrolled learners);
 *  - paid courses need a signed-in user;
 *  - authors (ADMIN_EMAILS) read everything, including drafts — preview mode;
 *  - enrolled users read everything;
 *  - signed-in users who are not enrolled may read lessons marked `preview: true`.
 */
export async function lessonAccess(user: User | null, course: Course, lesson: LessonRef): Promise<Access> {
  if (!user) return course.isFree ? { ok: true, enrolled: false } : { ok: false, reason: 'login' };
  if (isAuthor(user)) return { ok: true, enrolled: true, author: true };
  const enrolled = await isEnrolled(user.id, course.slug);
  if (enrolled) return { ok: true, enrolled };
  return lesson.preview || course.isFree ? { ok: true, enrolled } : { ok: false, reason: 'enroll' };
}

/** Free courses are enrolled in one click; paid ones go through checkout. */
export const enrollPath = (course: Course) => (course.isFree ? null : `/checkout/${course.slug}/`);
