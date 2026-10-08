import { getCollection } from 'astro:content';
import { contentRoute } from './content-routes.mjs';
import { listCourses } from './courses/catalog';
import type { SearchItem } from './search';
import type { Locale } from '../i18n/locales';

/** Everything searchable on the site: courses, their lessons, and library pages. */
export async function buildSearchIndex(lang: Locale): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  for (const course of await listCourses(lang)) {
    items.push({ title: course.title, href: `/courses/${course.slug}/`, kind: 'course', summary: course.summary, keywords: course.tags.join(' ') });
    for (const lesson of course.lessons) {
      items.push({ title: lesson.title, href: `/courses/${course.slug}/${lesson.slug}/`, kind: 'lesson', summary: lesson.summary, keywords: course.title });
    }
  }
  // Library pages: Hindi where it exists (when the reader uses Hindi), otherwise English.
  const pages = (await getCollection('lessons')).filter((entry) => entry.id !== 'en' && entry.id !== 'hi');
  const byRoute = new Map<string, (typeof pages)[number]>();
  for (const entry of pages) {
    const route = contentRoute(entry.id);
    if (entry.id.startsWith('en/') && !byRoute.has(route)) byRoute.set(route, entry);
    if (lang === 'hi' && entry.id.startsWith('hi/')) byRoute.set(route, entry);
  }
  for (const [route, entry] of byRoute) {
    const title = entry.body?.match(/^#\s+(.+)$/m)?.[1];
    if (title) items.push({ title, href: `/${route}/`, kind: 'page' });
  }
  return items;
}
