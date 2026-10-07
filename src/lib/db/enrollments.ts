import { db, now } from './client';

export type EnrollmentSource = 'free' | 'razorpay' | 'stripe' | 'grant';

export async function isEnrolled(userId: string, course: string) {
  return !!(await db().prepare('SELECT 1 AS ok FROM enrollments WHERE user_id = ? AND course = ?').bind(userId, course).first());
}

/** Idempotent: enrolling twice keeps the original row. */
export async function enroll(userId: string, course: string, source: EnrollmentSource) {
  await db().prepare('INSERT OR IGNORE INTO enrollments (user_id, course, source, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, course, source, now()).run();
}

export async function listEnrolledCourses(userId: string) {
  const { results } = await db().prepare('SELECT course FROM enrollments WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all<{ course: string }>();
  return results.map((row) => row.course);
}
