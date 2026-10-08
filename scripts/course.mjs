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
import { checkPackage } from '../src/lib/packages/check.mjs';
import { categorySlugs } from '../src/data/categories.ts';

const root = path.resolve(import.meta.dirname, '../content/courses');
const [command, ...args] = process.argv.slice(2);

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

/** Reads content/courses/<slug>/ into the shape checkPackage expects: Markdown text plus the set of image paths. */
function readCourseFolder(dir) {
  const files = new Map();
  const assets = new Set();
  const walk = (folder, prefix) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) walk(path.join(folder, entry.name), `${relative}/`);
      else if (entry.name.endsWith('.md')) files.set(relative, fs.readFileSync(path.join(folder, entry.name), 'utf8'));
      else assets.add(relative);
    }
  };
  walk(dir, '');
  return { files, assets };
}

function check() {
  let failed = false;
  for (const slug of fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory())) {
    const { errors, warnings } = checkPackage({ ...readCourseFolder(path.join(root, slug)), categories: categorySlugs });
    for (const w of warnings) console.warn(`! ${slug}/${w.where}: ${w.message}`);
    for (const e of errors) { console.error(`✗ ${slug}/${e.where}: ${e.message}`); failed = true; }
  }
  if (failed) process.exit(1);
  console.log('✓ all courses valid');
}

function fail(message) { console.error(message); process.exit(1); }

if (command === 'new') scaffold(args[0], args.includes('--free'));
else if (command === 'validate') check();
else fail('Commands: new <slug> [--free] | validate');
