import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLocalPath } from '../src/lib/paths.ts';

test('same-site paths are kept', () => {
  assert.equal(safeLocalPath('/courses/ai-confidence/'), '/courses/ai-confidence/');
  assert.equal(safeLocalPath('/a?b=1#c'), '/a?b=1#c');
});

test('anything that could leave the site falls back', () => {
  for (const bad of ['//evil.com', 'https://evil.com', 'evil.com', '/\\evil.com', '', null, undefined]) {
    assert.equal(safeLocalPath(bad, '/home/'), '/home/', `should reject ${bad}`);
  }
});

test('the fallback defaults to the home page', () => {
  assert.equal(safeLocalPath(null), '/');
});
