import { z } from 'astro/zod';

/**
 * The settings at the top of course.md and of every lesson file. One definition used by the site build
 * (src/content.config.ts), the upload checker (src/lib/packages/check.mjs) and `npm run course:validate`.
 */

/** content/courses/<course>/course.md front matter. `categories` = allowed category slugs. */
export const courseSettings = (categories) => z.object({
  title: z.string(),
  icon: z.string().default('📘'),
  /** The subject this course is filed under; see src/data/categories.ts. */
  category: z.enum(categories),
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
});

/** content/courses/<course>/<locale>/<lesson>.md front matter. */
export const lessonSettings = z.object({
  title: z.string(),
  summary: z.string().optional(),
  minutes: z.number().optional(),
  /** Learning goals shown at the top of the lesson. */
  objectives: z.array(z.string()).default([]),
  /** Lets signed-in, non-enrolled users read this lesson of a paid course. */
  preview: z.boolean().default(false),
  /** Hidden from the course outline in production. */
  draft: z.boolean().default(false)
});
