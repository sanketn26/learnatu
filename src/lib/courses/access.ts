import { isAuthor } from '../auth/roles';
import type { User } from '../db/users';
import { isEnrolled } from '../db/enrollments';
import type { Course, LessonRef } from './catalog';
import { decideAccess, type Access } from './access-rules';

export type { Access };

/**
 * The one place that decides who may read a lesson. It gathers the facts (sign-in, author, enrolment)
 * and hands them to `decideAccess` in access-rules.ts, where the rules are written down and tested.
 */
export async function lessonAccess(user: User | null, course: Course, lesson: LessonRef): Promise<Access> {
  return decideAccess({
    signedIn: !!user,
    isAuthor: isAuthor(user),
    enrolled: user ? await isEnrolled(user.id, course.slug) : false,
    courseIsFree: course.isFree,
    lessonIsPreview: lesson.preview
  });
}

/** Free courses are enrolled in one click; paid ones go through checkout. */
export const enrollPath = (course: Course) => (course.isFree ? null : `/checkout/${course.slug}/`);
