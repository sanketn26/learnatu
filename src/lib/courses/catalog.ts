import { getCollection, getEntry, render } from 'astro:content';
import type { Locale } from '../../i18n/locales';
import { buildCourse, compareCourses, type Course, type CourseSettings, type LessonRef } from './build-course';
import { getLesson, getPublishedVersion, getVersion, listLessons, listPublishedVersions, type VersionRow } from '../db/course-versions';

export type { Course, LessonRef, Price } from './build-course';
export { formatPrice } from './format';

/**
 * Where courses come from:
 *   git     content/courses/<slug>/   (built into the site)
 *   upload  zip files saved in the database, shown once an author publishes a version
 * Both are turned into the same `Course`, so pages do not care which one they have.
 * If a slug exists in both, the git course wins (uploads with a git slug are refused at upload time).
 */
const contentLocale = (lang: Locale) => (lang === 'hi' ? 'hi' : 'en');

type Options = {
  /** Include draft courses and lessons (authors, and every request in `astro dev`). */
  drafts?: boolean;
  /** Author preview: show this uploaded version instead of the published one. */
  previewVersion?: string | null;
};
const showDrafts = (options?: Options) => options?.drafts ?? import.meta.env.DEV;

// ---------------------------------------------------------------- git courses

async function gitLessonRef(course: string, slug: string, lang: Locale): Promise<LessonRef> {
  const wanted = contentLocale(lang);
  const entry = (await getEntry('courseLessons', `${course}/${wanted}/${slug}`)) ?? (await getEntry('courseLessons', `${course}/en/${slug}`));
  if (!entry) throw new Error(`course.md for "${course}" lists lesson "${slug}" but content/courses/${course}/en/${slug}.md does not exist`);
  const { draft, title, minutes, preview, objectives, summary } = entry.data;
  return { draft, slug, title, minutes, preview, objectives, summary, translated: entry.id === `${course}/${wanted}/${slug}` };
}

async function gitCourse(slug: string, lang: Locale, options?: Options): Promise<Course | null> {
  const meta = await getEntry('courseMeta', `${slug}/course`);
  if (!meta) return null;
  const settings = meta.data as CourseSettings;
  const names = settings.modules.flatMap((module) => module.lessons);
  const refs = await Promise.all(names.map(async (name) => [name, await gitLessonRef(slug, name, lang)] as const));
  return buildCourse(slug, settings, lang, new Map(refs), { showDrafts: showDrafts(options), source: 'git' });
}

// ------------------------------------------------------------ uploaded courses

async function versionCourse(version: VersionRow, lang: Locale, options?: Options): Promise<Course | null> {
  const settings = JSON.parse(version.settings) as CourseSettings;
  const rows = await listLessons(version.id);
  const wanted = contentLocale(lang);
  const refs = new Map<string, LessonRef>();
  for (const name of settings.modules.flatMap((module) => module.lessons)) {
    const row = rows.find((r) => r.lang === wanted && r.slug === name) ?? rows.find((r) => r.lang === 'en' && r.slug === name);
    if (!row) continue;
    const data = JSON.parse(row.settings);
    refs.set(name, { draft: data.draft, slug: name, title: data.title, minutes: data.minutes, preview: data.preview, objectives: data.objectives ?? [], summary: data.summary, translated: row.lang === wanted });
  }
  return buildCourse(version.course, settings, lang, refs, { showDrafts: showDrafts(options), source: 'upload', versionId: version.id, version: version.version });
}

async function uploadedCourse(slug: string, lang: Locale, options?: Options): Promise<Course | null> {
  const previewing = options?.previewVersion ? await getVersion(options.previewVersion) : null;
  const version = previewing?.course === slug ? previewing : await getPublishedVersion(slug);
  return version ? versionCourse(version, lang, previewing?.course === slug ? { ...options, drafts: true } : options) : null;
}

// ------------------------------------------------------------------ public API

export async function getCourse(slug: string, lang: Locale = 'en', options?: Options): Promise<Course | null> {
  return (await gitCourse(slug, lang, options)) ?? (await uploadedCourse(slug, lang, options));
}

export async function listCourses(lang: Locale = 'en', options?: Options): Promise<Course[]> {
  const metas = await getCollection('courseMeta');
  const gitSlugs = metas.map((m) => m.id.replace(/\/course$/, ''));
  const fromGit = await Promise.all(gitSlugs.map((slug) => gitCourse(slug, lang, options)));
  const fromUploads = await Promise.all((await listPublishedVersions()).filter((v) => !gitSlugs.includes(v.course)).map((v) => versionCourse(v, lang, options)));
  return [...fromGit, ...fromUploads].filter((c): c is Course => !!c).sort(compareCourses);
}

/** A lesson's text and settings, from whichever source the course has. */
export type LessonData = { title: string; summary?: string; minutes?: number; objectives: string[]; preview: boolean; draft: boolean };
export type Body = { Content: Awaited<ReturnType<typeof render>>['Content'] } | { html: string };
export type LessonContent = { data: LessonData; fallback: boolean; body: Body };

/** Loads a lesson, falling back to English when it is not translated. */
export async function getLessonContent(course: Course, slug: string, lang: Locale): Promise<LessonContent | null> {
  const wanted = contentLocale(lang);
  if (course.source === 'upload') {
    const row = (await getLesson(course.versionId!, wanted, slug)) ?? (await getLesson(course.versionId!, 'en', slug));
    return row ? { data: JSON.parse(row.settings), fallback: row.lang !== wanted, body: { html: row.html } } : null;
  }
  const entry = (await getEntry('courseLessons', `${course.slug}/${wanted}/${slug}`)) ?? (await getEntry('courseLessons', `${course.slug}/en/${slug}`));
  if (!entry) return null;
  const { Content } = await render(entry);
  return { data: entry.data, fallback: !entry.id.includes(`/${wanted}/`), body: { Content } };
}

/** The "About this course" body shown on the course page. */
export async function getCourseAbout(course: Course): Promise<Body | null> {
  if (course.source === 'upload') {
    const version = await getVersion(course.versionId!);
    return version?.about_html ? { html: version.about_html } : null;
  }
  const entry = await getEntry('courseMeta', `${course.slug}/course`);
  return entry ? { Content: (await render(entry)).Content } : null;
}
