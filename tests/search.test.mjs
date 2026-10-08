import test from 'node:test';
import assert from 'node:assert/strict';
import { searchItems } from '../src/lib/search.ts';

const items = [
  { title: 'Understand a loan before accepting it', href: '/a/', kind: 'lesson', summary: 'Interest and fees', keywords: 'Money Confidence' },
  { title: 'Money Confidence', href: '/b/', kind: 'course', summary: 'Plan your money' },
  { title: 'Passwords', href: '/c/', kind: 'page', summary: 'Keep email safe' }
];
const hrefs = (query) => searchItems(items, query).map((item) => item.href);

test('title matches rank above summary matches', () => {
  assert.deepEqual(hrefs('money'), ['/b/', '/a/']);
});

test('every word must match somewhere', () => {
  assert.deepEqual(hrefs('loan fees'), ['/a/']);
  assert.deepEqual(hrefs('loan passwords'), []);
});

test('matching ignores case and extra spaces', () => {
  assert.deepEqual(hrefs('  PASSWORDS '), ['/c/']);
});

test('an empty search finds nothing, and the limit is respected', () => {
  assert.deepEqual(hrefs(''), []);
  assert.equal(searchItems(items, 'o', 1).length, 1);
});
