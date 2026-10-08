import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCourse, compareCourses } from '../src/lib/courses/build-course.ts';

const settings = {
  title: 'Demo', icon: '📘', category: 'ai', summary: 'S', level: 'Beginner', status: 'published', featured: false, order: 100,
  tags: [], prerequisites: [], i18n: { hi: { title: 'डेमो' } },
  modules: [{ title: 'M1', lessons: ['a', 'b'] }, { title: 'M2', lessons: ['c'] }]
};
const ref = (slug, extra = {}) => ({ draft: false, slug, title: slug.toUpperCase(), preview: false, translated: true, objectives: [], ...extra });
const lessons = new Map([['a', ref('a')], ['b', ref('b', { draft: true })], ['c', ref('c')]]);
const build = (changes = {}, showDrafts = false, lang = 'en') =>
  buildCourse('demo', { ...settings, ...changes }, lang, lessons, { showDrafts, source: 'upload', versionId: 'v1' });

test('lessons are listed in module order; draft lessons are hidden', () => {
  const course = build();
  assert.deepEqual(course.lessons.map((l) => l.slug), ['a', 'c']);
  assert.equal(course.modules.length, 2);
});

test('draft lessons show when drafts are allowed', () => {
  assert.deepEqual(build({}, true).lessons.map((l) => l.slug), ['a', 'b', 'c']);
});

test('a module whose lessons are all hidden disappears', () => {
  const only = new Map([['a', ref('a', { draft: true })], ['c', ref('c')]]);
  const course = buildCourse('demo', { ...settings, modules: [{ title: 'M1', lessons: ['a'] }, { title: 'M2', lessons: ['c'] }] }, 'en', only, { showDrafts: false, source: 'git' });
  assert.deepEqual(course.modules.map((m) => m.title), ['M2']);
});

test('a draft course is hidden unless drafts are allowed', () => {
  assert.equal(build({ status: 'draft' }), null);
  assert.equal(build({ status: 'draft' }, true).status, 'draft');
});

test('translated title replaces the English one; price decides isFree', () => {
  assert.equal(build({}, false, 'hi').title, 'डेमो');
  assert.equal(build().isFree, true);
  assert.equal(build({ price: { inr: 99 } }).isFree, false);
});

test('courses sort featured first, then by order, then by title', () => {
  const a = build({ title: 'B' }), b = build({ title: 'A' }), c = build({ featured: true, title: 'Z' }), d = build({ order: 5, title: 'Y' });
  assert.deepEqual([a, b, c, d].sort(compareCourses).map((x) => x.title), ['Z', 'Y', 'A', 'B']);
});
