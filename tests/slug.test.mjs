import test from 'node:test';
import assert from 'node:assert/strict';
import { slugFromName } from '../src/lib/packages/slug.ts';

test('file names become course folder names', () => {
  assert.equal(slugFromName('My Course (v2).zip'), 'my-course-v2');
  assert.equal(slugFromName('money-confidence'), 'money-confidence');
  assert.equal(slugFromName('  --Hello__World--  '), 'hello-world');
  assert.equal(slugFromName('....'), '');
});
