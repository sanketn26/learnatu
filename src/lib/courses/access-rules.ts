/** Who may read a lesson. Pure: the caller looks up the facts, this decides. */
export type AccessFacts = {
  signedIn: boolean;
  isAuthor: boolean;
  enrolled: boolean;
  courseIsFree: boolean;
  lessonIsPreview: boolean;
};
export type Access =
  | { ok: true; enrolled: boolean; author?: boolean }
  | { ok: false; reason: 'login' | 'enroll' };

export function decideAccess(f: AccessFacts): Access {
  if (!f.signedIn) return f.courseIsFree ? { ok: true, enrolled: false } : { ok: false, reason: 'login' };
  if (f.isAuthor) return { ok: true, enrolled: true, author: true };
  if (f.enrolled) return { ok: true, enrolled: true };
  return f.lessonIsPreview || f.courseIsFree ? { ok: true, enrolled: false } : { ok: false, reason: 'enroll' };
}
