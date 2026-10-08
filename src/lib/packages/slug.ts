/** "My Course (v2).zip" -> "my-course-v2": lowercase words joined by hyphens, as course folder names must be. */
export function slugFromName(name: string) {
  return name
    .replace(/\.zip$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
