import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCookieValue, previewVersionFor } from '../src/lib/courses/preview.ts';

test('the preview cookie round-trips for its own course', () => {
  const value = previewCookieValue('money-confidence', 'abc-123');
  assert.equal(previewVersionFor(value, 'money-confidence'), 'abc-123');
});

test('it never applies to another course', () => {
  assert.equal(previewVersionFor('money-confidence:abc', 'ai-confidence'), null);
});

test('missing or broken cookies mean no preview', () => {
  for (const bad of [undefined, '', 'nocolon', ':abc', 'course:']) assert.equal(previewVersionFor(bad, 'course'), null);
});
