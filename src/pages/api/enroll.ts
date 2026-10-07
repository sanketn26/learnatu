import { authedApi, HttpError, json, readJson } from '../../lib/http';
import { getCourse } from '../../lib/courses/catalog';
import { enroll } from '../../lib/db/enrollments';
import { logger } from '../../lib/log';

export const prerender = false;
const log = logger('enroll');

/** Free courses only. Paid enrolment happens in payments/fulfil.ts after a verified payment. */
export const POST = authedApi(async ({ request }, user) => {
  const { course: slug } = await readJson<{ course: string }>(request);
  const course = await getCourse(slug);
  if (!course) throw new HttpError(404, 'Unknown course');
  if (!course.isFree) throw new HttpError(402, 'This course needs payment');
  await enroll(user.id, course.slug, 'free');
  log.info('free enrolment', { userId: user.id, course: course.slug });
  return json({ ok: true });
});
