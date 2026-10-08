import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { courseSettings, lessonSettings } from './lib/courses/schema.mjs';
import { categorySlugs } from './data/categories';

/** Library pages (about, safety guides, help) — not part of any course. */
const lessons = defineCollection({
  loader: glob({ pattern: ['en/**/*.md', 'hi/**/*.md'], base: './docs' })
});

/** content/courses/<course>/course.md — front matter = settings, body = "About this course". See content/README.md. */
const courseMeta = defineCollection({
  loader: glob({ pattern: '*/course.md', base: './content/courses' }),
  schema: courseSettings(categorySlugs)
});

/** content/courses/<course>/<locale>/<lesson>.md */
const courseLessons = defineCollection({
  loader: glob({ pattern: '*/{en,hi}/*.md', base: './content/courses' }),
  schema: lessonSettings
});

/** content/*.md — authoring docs, rendered at /author/guide/. */
const authorDocs = defineCollection({ loader: glob({ pattern: '*.md', base: './content' }) });

export const collections = { lessons, courseMeta, courseLessons, authorDocs };
