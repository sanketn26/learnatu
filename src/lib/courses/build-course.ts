import type { Price } from './format';

/** The shape every page uses for a course, no matter where it came from (git files or an uploaded zip). */
export type { Price };
export type LessonRef = { draft: boolean; slug: string; title: string; minutes?: number; preview: boolean; translated: boolean; objectives: string[]; summary?: string };
export type Course = {
  featured: boolean; order: number; accent?: string; tags: string[]; prerequisites: string[]; status: 'published' | 'draft';
  slug: string; icon: string; category: string; title: string; summary: string; outcome?: string; level: string;
  price: Price | null; isFree: boolean;
  modules: { title: string; lessons: LessonRef[] }[];
  lessons: LessonRef[]; // flat, in order
  /** 'git' = written in content/courses/; 'upload' = saved from a zip (then `versionId` says which version). */
  source: 'git' | 'upload';
  versionId?: string;
  version?: number;
};

/** The parts of course.md that building a course needs (a subset of the full settings). */
export type CourseSettings = {
  title: string; icon: string; category: string; summary: string; outcome?: string; level: string; status: 'published' | 'draft';
  price?: Price; featured: boolean; order: number; accent?: string; tags: string[]; prerequisites: string[];
  i18n: Record<string, { title?: string; summary?: string; outcome?: string }>;
  modules: { title: string; lessons: string[] }[];
};

/**
 * Builds a Course from its settings and its (already loaded) lessons. Pure.
 * Returns null for a draft course when drafts are hidden. Lessons marked draft are dropped when drafts are hidden.
 */
export function buildCourse(
  slug: string, settings: CourseSettings, lang: string, lessons: Map<string, LessonRef>,
  options: { showDrafts: boolean; source: 'git' | 'upload'; versionId?: string; version?: number }
): Course | null {
  if (settings.status === 'draft' && !options.showDrafts) return null;
  const { i18n, modules, price, ...base } = settings;
  const text = { ...base, ...(i18n[lang] ?? {}) };
  const resolved = modules
    .map((module) => ({
      title: module.title,
      lessons: module.lessons.map((name) => lessons.get(name)).filter((lesson): lesson is LessonRef => !!lesson && (!lesson.draft || options.showDrafts))
    }))
    .filter((module) => module.lessons.length);
  return {
    featured: base.featured, order: base.order, accent: base.accent, tags: base.tags, prerequisites: base.prerequisites, status: base.status,
    slug, icon: text.icon, category: base.category, title: text.title, summary: text.summary, outcome: text.outcome, level: text.level,
    price: price ?? null, isFree: !price, modules: resolved, lessons: resolved.flatMap((module) => module.lessons),
    source: options.source, versionId: options.versionId, version: options.version
  };
}

/** Free-first, then catalog order, then title: the order courses are listed in. */
export const compareCourses = (a: Course, b: Course) =>
  Number(b.featured) - Number(a.featured) || a.order - b.order || a.title.localeCompare(b.title);
