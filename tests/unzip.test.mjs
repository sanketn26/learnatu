import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { readZip, LIMITS } from '../src/lib/packages/unzip.mjs';

const zip = (files) => zipSync(Object.fromEntries(Object.entries(files).map(([name, value]) => [name, typeof value === 'string' ? strToU8(value) : value])));

test('reads markdown as text and images as assets', () => {
  const result = readZip(zip({ 'course.md': 'x', 'en/a.md': 'y', 'images/p.png': new Uint8Array([1, 2, 3]) }));
  assert.deepEqual(result.errors, []);
  assert.deepEqual([...result.files.keys()], ['course.md', 'en/a.md']);
  assert.equal(result.assets.get('images/p.png').contentType, 'image/png');
  assert.equal(result.rootName, null);
});

test('a single top folder is treated as the course folder', () => {
  const result = readZip(zip({ 'my-course/course.md': 'x', 'my-course/en/a.md': 'y' }));
  assert.equal(result.rootName, 'my-course');
  assert.deepEqual([...result.files.keys()], ['course.md', 'en/a.md']);
});

test('Mac junk and hidden files are skipped silently', () => {
  const result = readZip(zip({ 'course.md': 'x', '__MACOSX/._course.md': 'junk', '.DS_Store': 'junk' }));
  assert.deepEqual([...result.files.keys()], ['course.md']);
  assert.deepEqual(result.warnings, []);
});

test('other file types are ignored with a warning, and svg is not allowed', () => {
  const result = readZip(zip({ 'course.md': 'x', 'notes.txt': 'n', 'images/a.svg': '<svg/>' }));
  assert.equal(result.warnings.length, 2);
  assert.equal(result.assets.size, 0);
});

test('files that are too big are reported', () => {
  const result = readZip(zip({ 'course.md': 'x', 'en/a.md': 'y'.repeat(100) }), { ...LIMITS, maxTextBytes: 50 });
  assert.match(result.errors[0].message, /larger than/);
});

test('too many files or too much data is refused', () => {
  assert.match(readZip(zip({ a: '1', b: '2' }), { ...LIMITS, maxFiles: 1 }).errors[0].message, /more than 1 files/);
  assert.match(readZip(zip({ a: 'x'.repeat(2000) }), { ...LIMITS, maxTotalBytes: 1000 }).errors[0].message, /larger than/);
});

test('something that is not a zip gives a friendly error', () => {
  assert.match(readZip(strToU8('hello')).errors[0].message, /not a valid zip/);
});
