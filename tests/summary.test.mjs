import test from 'node:test';
import assert from 'node:assert/strict';
import { collectObjectives, totalMinutes, pickResume, lessonState, percentDone } from '../src/lib/courses/summary.ts';

test('objectives are gathered across lessons without repeats, up to the limit', () => {
  const lessons = [{ objectives: ['A', 'B'] }, { objectives: ['B', 'C'] }, { objectives: [] }, { objectives: ['D'] }];
  assert.deepEqual(collectObjectives(lessons), ['A', 'B', 'C', 'D']);
  assert.deepEqual(collectObjectives(lessons, 2), ['A', 'B']);
});

test('minutes add up and ignore lessons without a time', () => {
  assert.equal(totalMinutes([{ minutes: 3 }, {}, { minutes: 2 }]), 5);
  assert.equal(totalMinutes([]), 0);
});

test('resume goes to the first unfinished lesson, or the start when everything is done', () => {
  const lessons = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];
  assert.equal(pickResume(lessons, new Set(['a'])).slug, 'b');
  assert.equal(pickResume(lessons, new Set()).slug, 'a');
  assert.equal(pickResume(lessons, new Set(['a', 'b', 'c'])).slug, 'a');
});

test('lesson row state', () => {
  assert.equal(lessonState({ done: true, canRead: true, isResume: false }), 'done');
  assert.equal(lessonState({ done: false, canRead: false, isResume: false }), 'locked');
  assert.equal(lessonState({ done: false, canRead: true, isResume: true }), 'next');
  assert.equal(lessonState({ done: false, canRead: true, isResume: false }), 'open');
});

test('percent done', () => {
  assert.equal(percentDone(2, 5), 40);
  assert.equal(percentDone(0, 0), 0);
});
