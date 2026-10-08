import test from 'node:test';
import assert from 'node:assert/strict';
import { groupByCategory } from '../src/lib/courses/grouping.ts';

const courses = [
  { title: 'A', category: 'money' },
  { title: 'B', category: 'ai' },
  { title: 'C', category: 'money' }
];

test('groups follow the given category order, not the order of the courses', () => {
  const groups = groupByCategory(courses, ['ai', 'money']);
  assert.deepEqual(groups.map((g) => g.category), ['ai', 'money']);
});

test('courses keep their own order inside a group', () => {
  const money = groupByCategory(courses, ['money'])[0];
  assert.deepEqual(money.items.map((c) => c.title), ['A', 'C']);
});

test('categories with no courses are left out', () => {
  assert.deepEqual(groupByCategory(courses, ['physics', 'ai']).map((g) => g.category), ['ai']);
});

test('a course in an unknown category is not shown', () => {
  assert.deepEqual(groupByCategory([{ category: 'x' }], ['ai']), []);
});
