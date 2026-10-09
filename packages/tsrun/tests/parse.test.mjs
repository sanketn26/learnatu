import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, TsrunSyntaxError, LIMITS } from '../src/index.ts';

test('a bare block is just code with the defaults', () => {
  const b = parse('console.log(1);\n');
  assert.equal(b.code, 'console.log(1);');
  assert.equal(b.timeout, LIMITS.timeout.default);
  assert.ok(b.typecheck && b.strict && !b.readonly);
});

test('option lines at the top are read and removed from the code', () => {
  const b = parse('//@ title "Narrowing"\n//@ timeout 5\n//@ strict off\n//@ readonly\n\nconst n: number = 1;\n');
  assert.equal(b.title, 'Narrowing');
  assert.equal(b.timeout, 5);
  assert.ok(!b.strict && b.readonly && b.typecheck);
  assert.equal(b.code, 'const n: number = 1;');
});

test('a //@ line after the code is an ordinary comment', () => {
  assert.equal(parse('let x = 1;\n//@ not an option\n').code, 'let x = 1;\n//@ not an option');
});

test('mistakes name the line and say what to write', () => {
  assert.match(check('//@ timout 5\nlet x = 1;')[0].message, /Did you mean "timeout"/);
  assert.match(check('//@ timeout 999\nlet x = 1;')[0].message, /1 to 60/);
  assert.match(check('//@ typecheck maybe\nlet x = 1;')[0].message, /on or off/);
  assert.match(check('//@ title a\nlet x = 1;')[0].message, /in quotes/);
  assert.match(check('//@ readonly yes\nlet x = 1;')[0].message, /takes nothing/);
  assert.match(check('//@ typecheck off\n//@ strict on\nlet x = 1;')[0].message, /does nothing/);
  assert.match(check('//@ timeout 5\n')[0].message, /no TypeScript/);
  assert.match(check('let x = 1;\n'.repeat(5000))[0].message, /longer than/);
  assert.throws(() => parse('//@ nope\n//@ timeout 0\nlet x = 1;'), (e) => e instanceof TsrunSyntaxError && e.problems.length === 2);
});

test('mode render and size', () => {
  assert.equal(parse('let x = 1;').mode, 'run');
  const b = parse('//@ mode render\n//@ size 400 200\nrender("<b>hi</b>");');
  assert.equal(b.mode, 'render');
  assert.deepEqual(b.size, { width: 400, height: 200 });
  assert.deepEqual(parse('//@ mode render\nrender("x");').size, { width: 600, height: 300 });
  assert.match(check('//@ mode paint\nlet x = 1;')[0].message, /run or render/);
  assert.match(check('//@ size 400 200\nlet x = 1;')[0].message, /only for mode render/);
  assert.match(check('//@ mode render\n//@ size 5 200\nrender("x");')[0].message, /each from 40 to 1000/);
  assert.match(check('//@ mode render\n//@ size 1000 1000\n//@ size 1 1\nrender("x");').map((p) => p.message).join(' '), /written twice/);
});
