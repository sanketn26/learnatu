#!/usr/bin/env node
/**
 * Course authoring CLI.
 *   npm run course:new -- <slug> [--free]   scaffold content/courses/<slug>/ from the sample course
 *   npm run course:validate                 check every course, lesson and quiz without a full build
 *
 * Publishing a course = commit it and push (or `npm run deploy`). Set `status: published` when ready.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { validate as validateQuiz } from '../src/lib/remark-quiz.mjs';

const root = path.resolve(import.meta.dirname, '../content/courses');
const [command, ...args] = process.argv.slice(2);

function frontMatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('missing front matter (--- block at the top)');
  return { data: parse(match[1]) ?? {}, body: match[2] };
}

function scaffold(slug, free) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug ?? '')) fail('Usage: npm run course:new -- <kebab-case-slug> [--free]');
  const target = path.join(root, slug);
  if (fs.existsSync(target)) fail(`${target} already exists`);
  fs.cpSync(path.join(root, 'sample-paid-course'), target, { recursive: true });
  const file = path.join(target, 'course.md');
  let text = fs.readFileSync(file, 'utf8').replace(/^title: .*/m, `title: ${slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`);
  if (free) text = text.replace(/^price:.*\n/m, '');
  fs.writeFileSync(file, text);
  console.log(`Created content/courses/${slug}/ (status: draft). Preview it as an author at /author/, then set status: published.`);
}

function check() {
  const problems = [];
  const add = (where, message) => problems.push(`${where}: ${message}`);
  for (const slug of fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory())) {
    const courseFile = path.join(root, slug, 'course.md');
    if (!fs.existsSync(courseFile)) { add(slug, 'course.md is missing'); continue; }
    let course;
    try { course = frontMatter(courseFile).data; } catch (error) { add(`${slug}/course.md`, error.message); continue; }
    for (const key of ['title', 'summary', 'modules']) if (!course[key]) add(`${slug}/course.md`, `"${key}" is required`);
    const listed = (course.modules ?? []).flatMap((m) => m.lessons ?? []);
    const dupes = listed.filter((l, i) => listed.indexOf(l) !== i);
    if (dupes.length) add(`${slug}/course.md`, `lesson listed twice: ${dupes.join(', ')}`);
    for (const lesson of listed) {
      const file = path.join(root, slug, 'en', `${lesson}.md`);
      if (!fs.existsSync(file)) { add(`${slug}/course.md`, `lists "${lesson}" but en/${lesson}.md does not exist`); continue; }
      for (const locale of ['en', 'hi']) {
        const lessonFile = path.join(root, slug, locale, `${lesson}.md`);
        if (!fs.existsSync(lessonFile)) continue;
        const where = `${slug}/${locale}/${lesson}.md`;
        try {
          const { data, body } = frontMatter(lessonFile);
          if (!data.title) add(where, '"title" is required');
          if (/^# /m.test(body)) add(where, 'body has a "# " heading — the title is added automatically');
          [...body.matchAll(/```quiz\n([\s\S]*?)```/g)].forEach((m, i) => {
            try { validateQuiz(parse(m[1]), { path: where }, i); } catch (error) { add(where, error.message.replace(/^.*?: /, '')); }
          });
        } catch (error) { add(where, error.message); }
      }
    }
    const orphans = fs.readdirSync(path.join(root, slug, 'en')).map((f) => f.replace(/\.md$/, '')).filter((f) => !listed.includes(f));
    if (orphans.length) add(slug, `lesson files not listed in course.md: ${orphans.join(', ')}`);
  }
  if (problems.length) { console.error(problems.map((p) => `✗ ${p}`).join('\n')); process.exit(1); }
  console.log('✓ all courses valid');
}

function fail(message) { console.error(message); process.exit(1); }

if (command === 'new') scaffold(args[0], args.includes('--free'));
else if (command === 'validate') check();
else fail('Commands: new <slug> [--free] | validate');
