import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPackage } from '../src/lib/packages/check.mjs';

const categories = ['ai', 'money'];
const courseMd = `---
title: Demo
category: ai
summary: A demo.
modules:
  - title: Start
    lessons: [one, two]
---
About text.`;
const lesson = (title, extra = '') => `---\ntitle: ${title}\n---\nBody. ${extra}`;
const good = () => new Map([
  ['course.md', courseMd],
  ['en/one.md', lesson('One')],
  ['en/two.md', lesson('Two')]
]);
const check = (files, assets) => checkPackage({ files, assets, categories });
const messages = (result) => result.errors.map((e) => `${e.where}: ${e.message}`);

test('a good course passes and comes back parsed', () => {
  const result = check(good());
  assert.deepEqual(result.errors, []);
  assert.equal(result.course.settings.title, 'Demo');
  assert.equal(result.course.settings.level, 'Beginner'); // default filled in
  assert.deepEqual(result.course.lessons.map((l) => l.slug), ['one', 'two']);
  assert.equal(result.course.about.trim(), 'About text.');
});

test('course.md is required', () => {
  const files = good(); files.delete('course.md');
  assert.match(messages(check(files))[0], /course\.md: is missing/);
});

test('an unknown category is rejected', () => {
  const files = good(); files.set('course.md', courseMd.replace('category: ai', 'category: cooking'));
  assert.match(messages(check(files)).join('\n'), /category/);
});

test('a listed lesson with no file is an error that names it', () => {
  const files = good(); files.delete('en/two.md');
  assert.match(messages(check(files)).join('\n'), /lists "two" but en\/two\.md does not exist/);
});

test('a lesson file that is not listed is only a warning', () => {
  const files = good(); files.set('en/extra.md', lesson('Extra'));
  const result = check(files);
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings[0].message, /not listed/);
});

test('a "# " heading in a lesson is an error', () => {
  const files = good(); files.set('en/one.md', '---\ntitle: One\n---\n# One again\ntext');
  assert.match(messages(check(files)).join('\n'), /has a "# " heading/);
});

test('a broken quiz names the file and the problem', () => {
  const quiz = '```quiz\ntype: single\nquestion: Q?\noptions: [a, b, c]\nanswer: 4\n```\n';
  const files = good(); files.set('en/one.md', lesson('One', '\n' + quiz));
  assert.match(messages(check(files)).join('\n'), /en\/one\.md: .*answer must be an option number/);
});

test('missing Hindi lessons are a warning only when a hi folder exists', () => {
  assert.equal(check(good()).warnings.length, 0);
  const files = good(); files.set('hi/one.md', lesson('एक'));
  const result = check(files);
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.map((w) => w.where).join(), /hi\/two\.md/);
});

test('images must be in the package', () => {
  const files = good(); files.set('en/one.md', lesson('One', '\n![chart](../images/chart.png)'));
  assert.match(messages(check(files)).join('\n'), /image "..\/images\/chart.png" is not in the zip/);
  assert.deepEqual(check(files, new Set(['images/chart.png'])).errors, []);
});

test('bad settings give a readable message', () => {
  const files = good(); files.set('en/one.md', 'no settings here');
  assert.match(messages(check(files)).join('\n'), /missing settings block/);
});

test('images and rich blocks are checked with the lesson and line', () => {
  const files = good();
  files.set('en/one.md', lesson('One', '\n\n![](../images/chart.png)\n\n:::wat\nx\n:::'));
  const found = messages(check(files, new Set(['images/chart.png']))).join('\n');
  assert.match(found, /en\/one\.md: line \d+: an image needs alt text/);
  assert.match(found, /en\/one\.md: line \d+: unknown block/);
});

test('a pyrun block with a mistake is reported with its number and line', () => {
  const files = good();
  files.set('en/one.md', lesson('One', '\n\n```pyrun\nprint(1)\n```\n\n```pyrun\n#@ packages requests\nprint(2)\n```\n'));
  const out = messages(check(files));
  assert.equal(out.length, 1);
  assert.match(out[0], /en\/one\.md: Python block #2, line 1: "requests" is not available here/);
});

test('a tsrun block with a mistake is reported with its number and line', () => {
  const files = good();
  files.set('en/one.md', lesson('One', '\n\n```tsrun\nlet a = 1;\n```\n\n```tsrun\n//@ mode sparkle\nlet b = 2;\n```\n'));
  const out = messages(check(files));
  assert.equal(out.length, 1);
  assert.match(out[0], /en\/one\.md: TypeScript block #2, line 1: mode is run or render/);
});
