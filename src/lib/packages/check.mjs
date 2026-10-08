import path from 'node:path';
import { parse } from 'yaml';
import { courseSettings, lessonSettings } from '../courses/schema.mjs';
import { validate as validateQuiz } from '../remark-quiz.mjs';
import { splitFrontMatter } from './frontmatter.mjs';

/**
 * Checks a course package (the contents of a zip, or a folder under content/courses/) before it is saved.
 * Pure: give it the files, get back problems. Used by the upload page and by `npm run course:validate`.
 *
 *   files   Map of path -> text, for course.md and en/*.md, hi/*.md      (paths relative to the course folder)
 *   assets  Set of paths of other files (images)
 *   categories  allowed category slugs
 *
 * Returns { errors, warnings, course }. Errors block saving; warnings do not. `course` is null when there are errors.
 */
export const LANGS = ['en', 'hi'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Finds the asset a Markdown image link points to: relative to the lesson's folder, or to the course folder. */
export function resolveAsset(ref, fromPath, assets) {
  const fromLesson = path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), ref));
  if (assets.has(fromLesson)) return fromLesson;
  const fromRoot = path.posix.normalize(ref);
  return assets.has(fromRoot) ? fromRoot : null;
}

export function checkPackage({ files, assets = new Set(), categories }) {
  const errors = [];
  const warnings = [];
  const error = (where, message) => errors.push({ where, message });
  const warn = (where, message) => warnings.push({ where, message });

  const courseText = files.get('course.md');
  if (courseText === undefined) { error('course.md', 'is missing. Put it at the top of the course folder.'); return { errors, warnings, course: null }; }
  let front;
  try { front = splitFrontMatter(courseText); } catch (e) { error('course.md', e.message); return { errors, warnings, course: null }; }

  const parsed = courseSettings(categories).safeParse(front.data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.');
      error('course.md', field ? `"${field}": ${issue.message}` : issue.message);
    }
    return { errors, warnings, course: null };
  }
  const settings = parsed.data;

  const listed = settings.modules.flatMap((module) => module.lessons);
  const duplicates = [...new Set(listed.filter((slug, i) => listed.indexOf(slug) !== i))];
  if (duplicates.length) error('course.md', `lesson listed twice: ${duplicates.join(', ')}`);
  for (const slug of listed) if (!KEBAB.test(slug)) error('course.md', `lesson name "${slug}" must be lowercase words joined by hyphens`);

  const lessons = [];
  for (const slug of listed) {
    if (!files.has(`en/${slug}.md`)) error('course.md', `lists "${slug}" but en/${slug}.md does not exist`);
  }
  for (const lang of LANGS) {
    for (const [file, text] of files) {
      const match = file.match(new RegExp(`^${lang}/([^/]+)\\.md$`));
      if (!match) continue;
      const slug = match[1];
      if (!listed.includes(slug)) { warn(file, 'is not listed in course.md, so it will not appear'); continue; }
      let lessonFront;
      try { lessonFront = splitFrontMatter(text); } catch (e) { error(file, e.message); continue; }
      const lesson = lessonSettings.safeParse(lessonFront.data);
      if (!lesson.success) {
        for (const issue of lesson.error.issues) error(file, `"${issue.path.join('.') || 'settings'}": ${issue.message}`);
        continue;
      }
      if (/^# /m.test(lessonFront.body)) error(file, 'has a "# " heading. The title is added automatically, so remove it.');
      [...lessonFront.body.matchAll(/```quiz\n([\s\S]*?)```/g)].forEach((m, i) => {
        try { validateQuiz(parse(m[1]), { path: file }, i); } catch (e) { error(file, e.message.replace(/^.*?: /, '')); }
      });
      for (const [, ref] of lessonFront.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
        if (/^(https?:|data:|\/)/.test(ref)) continue;
        if (!resolveAsset(ref, file, assets)) error(file, `image "${ref}" is not in the zip`);
      }
      lessons.push({ lang, slug, data: lesson.data, body: lessonFront.body });
    }
  }
  if (files.has('hi/') || [...files.keys()].some((f) => f.startsWith('hi/'))) {
    for (const slug of listed) if (!files.has(`hi/${slug}.md`)) warn(`hi/${slug}.md`, 'is missing. Hindi readers will see the English lesson.');
  }
  for (const file of files.keys()) {
    if (file !== 'course.md' && !LANGS.some((lang) => file.startsWith(`${lang}/`))) warn(file, 'is ignored (only course.md, en/ and hi/ are used)');
  }

  if (errors.length) return { errors, warnings, course: null };
  return { errors, warnings, course: { settings, about: front.body, lessons } };
}

export { KEBAB as COURSE_SLUG };
