import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, EXAMPLES } from '../src/index.ts';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');
const end = (text, values = {}) => { const run = parse(text).run(values); return run.describe(run.count - 1); };

test('every bloch example is valid', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'bloch')) assert.deepEqual(check(e.text), [], e.id);
});

test('gates are rotations: H|0⟩ = |+⟩, HH = identity, X|0⟩ = |1⟩, S|+⟩ = |i⟩', () => {
  assert.match(end('scene bloch\nstate |0>\ngate H'), /State \|\+⟩ = 0\.707\|0⟩ \+ 0\.707\|1⟩\./);
  assert.match(end('scene bloch\nstate |0>\ngate H\ngate H'), /State \|0⟩ = \|0⟩\./);
  assert.match(end('scene bloch\nstate |0>\ngate X'), /State \|1⟩ = \|1⟩\./);
  assert.match(end('scene bloch\nstate |+>\ngate S'), /State \|i⟩ = 0\.707\|0⟩ \+ e\^\(i·90°\)·0\.707\|1⟩\./);
  assert.match(end('scene bloch\nstate |+>\ngate T\ngate T'), /State \|i⟩/);
  assert.match(end('scene bloch\nstate |+>\ngate Rz angle=180deg'), /State \|−⟩/);
});

test('measurement odds follow the sphere: 50/50 on the equator, certain at the poles', () => {
  assert.match(end('scene bloch\nstate |0>\ngate H\nmeasure z'), /Measuring along z: 50% \|0⟩, 50% \|1⟩/);
  assert.match(end('scene bloch\nstate |0>'), /100% \|0⟩, 0% \|1⟩/);
  assert.match(end('scene bloch\nstate |0>\ngate H\nmeasure x'), /Measuring along x: 100% \|\+⟩, 0% \|−⟩/);
  assert.match(end('scene bloch\nstate theta=60deg phi=0deg'), /75% \|0⟩, 25% \|1⟩/);
});

test('a gate is animated as the turn it is: frames lie on the sphere and go through the half-way point', () => {
  const run = parse('scene bloch\nstate |0>\ngate X').run({});
  assert.equal(run.count, 15);
  assert.match(run.describe(7), /State .*Measuring along z: 5\d(\.\d+)?% \|0⟩/);   // half way: about even odds
  assert.ok(!run.svg(7).includes('NaN'));
});

test('steps narrate, and the sliders turn the gate', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'phase').text);
  const a = s.run({ turn: Math.PI / 2 }), b = s.run({ turn: Math.PI });
  assert.match(a.caption(0), /Start on the equator/);
  assert.notEqual(a.describe(a.count - 1), b.describe(b.count - 1));
  assert.match(a.clock(a.count - 1), /step 3 of 3/);
});

test('mistakes are explained', () => {
  assert.match(messages('scene bloch\nstate |2>'), /don't know the state "\|2>"/);
  assert.match(messages('scene bloch\ngate Hadamard'), /a gate is one of/);
  assert.match(messages('scene bloch\ngate Rz'), /Rz needs an angle/);
  assert.match(messages('scene bloch\ngate H angle=90deg'), /takes no angle/);
  assert.match(messages('scene bloch\ngate Rz angle=90'), /needs a unit: deg or rad/);
  assert.match(messages('scene bloch\ngate H\nstate |1>'), /must come before any step or gate/);
  assert.match(messages('scene bloch\nmeasure w'), /measure needs an axis/);
  assert.match(messages('scene bloch\ngate Rzz angle=90deg'), /Did you mean "Rz"\?/);
});
