import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const lessons = defineCollection({
  loader: glob({ pattern: ['en/**/*.md', 'hi/**/*.md'], base: './docs' })
});

export const collections = { lessons };
