import { getCollection, getEntry } from 'astro:content';
import type { Locale } from '../../i18n/locales';

import type { Price } from './format';
export { formatPrice } from './format';
export type { Price };
export type LessonRef = { draft: boolean; slug: string; title: string; minutes?: number; preview: boolean; translated: boolean; objectives: string[] };
export type Course = {
  featured: boolean; order: number; accent?: string; tags: string[]; prerequisites: string[]; status: 'published' | 'draft';
  slug: string; icon: string; category: string; title: string; summary: string; outcome?: string; level: string;
  price: Price | null; isFree: boolean;
  modules: { title: string; lessons: LessonRef[] }[];
  lessons: LessonRef[]; // flat, in order
};

const contentLocale = (lang: Locale) => (lang === 'hi' ? 'hi' : 'en');

type Options = { /** Include draft courses and lessons (authors, and every request in `astro dev`). */ drafts?: boolean };
const showDrafts = (options?: Options) => options?.drafts ?? import.meta.env.DEV;

async function lessonRef(course: string, slug: string, lang: Locale): Promise<LessonRef> {
  const wanted = contentLocale(lang);
  const entry = (await getEntry('courseLessons', `${course}/${wanted}/${slug}`)) ?? (await getEntry('courseLessons', `${course}/en/${slug}`));
  if (!entry) throw new Error(`course.yml for "${course}" lists lesson "${slug}" but content/courses/${course}/en/${slug}.md does not exist`);
  return {
    draft: entry.data.draft, slug, title: entry.data.title, minutes: entry.data.minutes, preview: entry.data.preview, objectives: entry.data.objectives,
    translated: entry.id === `${course}/${wanted}/${slug}`
  };
}

/** Rendered "About this course" body of course.md, for the landing page. */
export const getCourseAbout = (slug: string) => getEntry('courseMeta', `${slug}/course`);

export async function getCourse(slug: string, lang: Locale = 'en', options?: Options): Promise<Course | null> {
  const meta = await getEntry('courseMeta', `${slug}/course`);
  if (!meta) return null;
  const { i18n, modules, price, ...base } = meta.data;
  if (base.status === 'draft' && !showDrafts(options)) return null;
  const text = { ...base, ...(i18n[lang] ?? {}) };
  const resolved = (await Promise.all(modules.map(async (module) => ({
    title: module.title,
    lessons: (await Promise.all(module.lessons.map((lesson) => lessonRef(slug, lesson, lang)))).filter((lesson) => !lesson.draft || showDrafts(options))
  })))).filter((module) => module.lessons.length);
  return {
    featured: base.featured, order: base.order, accent: base.accent, tags: base.tags, prerequisites: base.prerequisites, status: base.status,
    slug, icon: text.icon, category: base.category, title: text.title, summary: text.summary, outcome: text.outcome, level: text.level,
    price: price ?? null, isFree: !price, modules: resolved, lessons: resolved.flatMap((m) => m.lessons)
  };
}

export async function listCourses(lang: Locale = 'en', options?: Options): Promise<Course[]> {
  const metas = await getCollection('courseMeta');
  const courses = await Promise.all(metas.map((m) => getCourse(m.id.replace(/\/course$/, ''), lang, options)));
  return courses.filter((c): c is Course => !!c).sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order || a.title.localeCompare(b.title));
}

/** Loads the Markdown entry for a lesson, falling back to English when untranslated. */
export async function getLessonEntry(course: string, slug: string, lang: Locale) {
  const wanted = contentLocale(lang);
  const entry = await getEntry('courseLessons', `${course}/${wanted}/${slug}`);
  if (entry) return { entry, fallback: false };
  const english = await getEntry('courseLessons', `${course}/en/${slug}`);
  return english ? { entry: english, fallback: lang !== 'en' } : null;
}
