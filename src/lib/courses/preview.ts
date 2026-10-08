/**
 * Author preview: an author can look at an uploaded draft version as a learner would. The choice is kept in a
 * cookie named `preview` whose value is "<course>:<versionId>", and applies to that one course.
 */
export const PREVIEW_COOKIE = 'preview';

export const previewCookieValue = (course: string, versionId: string) => `${course}:${versionId}`;

/** The version to preview for `course`, or null when the cookie is missing, malformed or for another course. */
export function previewVersionFor(cookieValue: string | undefined, course: string): string | null {
  if (!cookieValue) return null;
  const at = cookieValue.indexOf(':');
  if (at < 1) return null;
  return cookieValue.slice(0, at) === course ? cookieValue.slice(at + 1) || null : null;
}
