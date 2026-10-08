import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { categorySlugs } from './data/categories';

/** Library pages (about, safety guides, help) — not part of any course. */
const lessons = defineCollection({
  loader: glob({ pattern: ['en/**/*.md', 'hi/**/*.md'], base: './docs' })
});

/** content/courses/<course>/course.md — front matter = settings, body = "About this course". See content/README.md. */
const courseMeta = defineCollection({
  loader: glob({ pattern: '*/course.md', base: './content/courses' }),
  schema: z.object({
    title: z.string(),
    icon: z.string().default('📘'),
    /** The subject this course is filed under; see src/data/categories.ts for the allowed values. */
    category: z.enum(categorySlugs),
    summary: z.string(),
    outcome: z.string().optional(),
    level: z.string().default('Beginner'),
    /** `draft` hides the course from the catalog and 404s it in production (still visible in `astro dev`). */
    status: z.enum(['published', 'draft']).default('published'),
    /** Major units (₹ / $). Omit for a free course. */
    price: z.object({ inr: z.number().positive().optional(), usd: z.number().positive().optional() }).optional(),
    /** Shown first on the home page. */
    featured: z.boolean().default(false),
    /** Catalog sort order (lower first). */
    order: z.number().default(100),
    /** Optional brand colour (#rrggbb) for the course cover. */
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    tags: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    /** Optional per-locale overrides of title / summary / outcome. */
    i18n: z.record(z.string(), z.object({ title: z.string().optional(), summary: z.string().optional(), outcome: z.string().optional() })).default({}),
    modules: z.array(z.object({ title: z.string(), lessons: z.array(z.string()).min(1) })).min(1)
  })
});

/** content/courses/<course>/<locale>/<lesson>.md */
const courseLessons = defineCollection({
  loader: glob({ pattern: '*/{en,hi}/*.md', base: './content/courses' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    minutes: z.number().optional(),
    /** Learning goals shown at the top of the lesson. */
    objectives: z.array(z.string()).default([]),
    /** Lets signed-in, non-enrolled users read this lesson of a paid course. */
    preview: z.boolean().default(false),
    /** Hidden from the course outline in production. */
    draft: z.boolean().default(false)
  })
});

/** content/*.md — authoring docs, rendered at /author/guide/. */
const authorDocs = defineCollection({ loader: glob({ pattern: '*.md', base: './content' }) });

export const collections = { lessons, courseMeta, courseLessons, authorDocs };
