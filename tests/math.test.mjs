import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMath } from '../src/lib/packages/math.mjs';

test('good formulas have no problems', () => {
  assert.deepEqual(checkMath('Inline $a^2 + b^2 = c^2$ and\n\n$$\\int_0^1 x\\,dx = \\tfrac12$$'), []);
});

test('a formula KaTeX cannot read is reported with its line', () => {
  const problems = checkMath('Fine $x$.\n\nThen a bad one: $\\badcommand$ here.');
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 3);
  assert.match(problems[0].message, /badcommand/);
});

test('an unclosed brace in a display formula is reported', () => {
  assert.match(checkMath('$$\\frac{1}{2$$')[0].message, /Expected|brace|group/i);
});

test('formulas in code and escaped dollars are not checked', () => {
  assert.deepEqual(checkMath('`$\\nope$`\n\n```\n$$\\nope$$\n```\n\nCosts \\$5 and \\$6.'), []);
});
