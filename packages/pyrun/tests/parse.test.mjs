import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, PyrunSyntaxError, LIMITS } from '../src/index.ts';

test('a bare block is just code with the defaults', () => {
  const b = parse('print(1)\n');
  assert.equal(b.code, 'print(1)');
  assert.equal(b.timeout, LIMITS.timeout.default);
  assert.deepEqual(b.packages, []);
  assert.equal(b.readonly, false);
});

test('option lines at the top are read and removed from the code', () => {
  const b = parse('#@ title "Squares"\n#@ timeout 5\n#@ packages numpy pandas\n#@ stdin "Asha" "42"\n#@ readonly\n#@ shared\n\nprint(1)\n');
  assert.equal(b.title, 'Squares');
  assert.equal(b.timeout, 5);
  assert.deepEqual(b.packages, ['numpy', 'pandas']);
  assert.deepEqual(b.stdin, ['Asha', '42']);
  assert.ok(b.readonly && b.shared);
  assert.equal(b.code, 'print(1)');
});

test('a #@ line after the code is an ordinary comment', () => {
  assert.equal(parse('x = 1\n#@ not an option\n').code, 'x = 1\n#@ not an option');
});

test('mistakes name the line and say what to write', () => {
  assert.match(check('#@ timout 5\nprint(1)')[0].message, /Did you mean "timeout"/);
  assert.equal(check('#@ timout 5\nprint(1)')[0].line, 1);
  assert.match(check('#@ timeout 999\nprint(1)')[0].message, /1 to 60/);
  assert.match(check('#@ packages requests\nprint(1)')[0].message, /not available here/);
  assert.match(check('#@ stdin Asha\nprint(1)')[0].message, /in quotes/);
  assert.match(check('#@ title "a"\n#@ title "b"\nprint(1)')[0].message, /twice/);
  assert.match(check('#@ readonly yes\nprint(1)')[0].message, /takes nothing/);
  assert.match(check('#@ timeout 5\n')[0].message, /no Python/);
  assert.match(check('x = 1\n'.repeat(5000))[0].message, /longer than/);
});

test('parse throws one error listing every problem', () => {
  assert.throws(() => parse('#@ nope\n#@ timeout 0\nprint(1)'), (e) => e instanceof PyrunSyntaxError && e.problems.length === 2);
});
