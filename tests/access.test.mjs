import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAccess } from '../src/lib/courses/access-rules.ts';

// Start from "an anonymous visitor on a paid lesson" and change only what each test is about.
const base = { signedIn: false, isAuthor: false, enrolled: false, courseIsFree: false, lessonIsPreview: false };
const decide = (changes) => decideAccess({ ...base, ...changes });

test('anyone can read a free course, but progress is not saved without enrolment', () => {
  assert.deepEqual(decide({ courseIsFree: true }), { ok: true, enrolled: false });
  assert.deepEqual(decide({ courseIsFree: true, signedIn: true }), { ok: true, enrolled: false });
});

test('a paid course needs sign-in first', () => {
  assert.deepEqual(decide({}), { ok: false, reason: 'login' });
  assert.deepEqual(decide({ lessonIsPreview: true }), { ok: false, reason: 'login' });
});

test('signed in but not enrolled: only preview lessons of a paid course', () => {
  assert.deepEqual(decide({ signedIn: true }), { ok: false, reason: 'enroll' });
  assert.deepEqual(decide({ signedIn: true, lessonIsPreview: true }), { ok: true, enrolled: false });
});

test('enrolled learners read everything in the course', () => {
  assert.deepEqual(decide({ signedIn: true, enrolled: true }), { ok: true, enrolled: true });
});

test('authors read everything and are marked as authors', () => {
  assert.deepEqual(decide({ signedIn: true, isAuthor: true }), { ok: true, enrolled: true, author: true });
});
