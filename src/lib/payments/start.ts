import { env } from 'cloudflare:workers';
import { HttpError } from '../http';
import { getCourse, type Course } from '../courses/catalog';
import { quote, type Currency } from '../courses/pricing';
import { isEnrolled } from '../db/enrollments';
import type { User } from '../db/users';

/** Shared pre-flight for both providers: course exists, is paid, is sold in this currency, user doesn't already own it. */
export async function prepareCheckout(user: User, courseSlug: string, currency: Currency): Promise<{ course: Course; amount: number; siteUrl: string }> {
  const course = await getCourse(courseSlug);
  if (!course) throw new HttpError(404, 'Unknown course');
  const price = quote(course, currency);
  if (!price) throw new HttpError(400, `This course is not sold in ${currency}`);
  if (await isEnrolled(user.id, course.slug)) throw new HttpError(409, 'You already own this course');
  return { course, amount: price.amount, siteUrl: env.SITE_URL.replace(/\/$/, '') };
}
