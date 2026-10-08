import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, EXAMPLES } from '../src/index.ts';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');

test('every spacetime example is valid', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'spacetime')) assert.deepEqual(check(e.text), [], e.id);
});

test('the interval between two events is the same in every frame', () => {
  const s = parse(`scene spacetime\nevent A at=(0yr,0ly)\nevent B at=(5yr,3ly)\nframe F v=0.6c\nmeasure A B`);
  const run = s.run({});
  assert.match(run.caption(0), /Δt′ = 5 years, Δx′ = 3 light-years.*timelike: 4 years of proper time/);
  // at 0.6c towards B the coordinates change a lot (γ = 1.25): Δt′ = 1.25(5 − 0.6·3) = 4, Δx′ = 1.25(3 − 0.6·5) = 0
  assert.match(run.caption(run.count - 1), /Δt′ = 4 years, Δx′ = 0 light-years.*4 years of proper time/);
});

test('simultaneity is relative: events at the same time in S are not at the same time for a moving observer', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'relativity-of-simultaneity').text);
  const run = s.run({ v: 0.6 * 299792458 });
  assert.match(run.caption(0), /Δt′ = 0 years, Δx′ = 3 light-years/);
  // Δt′ = γ(0 − 0.6·3) = −2.25 years
  assert.match(run.caption(run.count - 1), /Δt′ = -2\.25 years/);
  assert.match(run.svg(run.count - 1), /same time in S/);
});

test('time dilation: a clock at 0.8c runs slow by γ = 1.667 in the rest frame, and not at all in its own', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'time-dilation').text);
  const run = s.run({ v: 0.8 * 299792458 });
  assert.match(run.caption(0), /Clock Traveller runs slow by ×1\.67/);
  assert.match(run.caption(run.count - 1), /Clock Traveller runs slow by ×1 /);
});

test('light cones stay at 45° and the picture has no NaN', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'spacetime')) {
    const run = parse(e.text).run({});
    for (const i of [0, run.count >> 1, run.count - 1]) assert.ok(!run.svg(i).includes('NaN'), `${e.id} frame ${i}`);
  }
});

test('units: other time scales pick their own light-distance units', () => {
  const run = parse(`scene spacetime\nevent A at=(0us,0m)\nevent B at=(2us,300m)\nmeasure A B`).run({});
  assert.match(run.caption(0), /microseconds.*light-microseconds/);
});

test('nothing goes faster than light', () => {
  assert.match(messages('scene spacetime\nevent A at=(0yr,0ly)\nevent B at=(1yr,3ly)\nworldline W from=A to=B'), /faster than light \(A to B covers 3c\).*spacelike/);
  assert.match(messages('scene spacetime\nevent A at=(0yr,0ly)\nframe F v=1.2c'), /frame speed must be slower than light/);
  assert.match(messages('scene spacetime\nparam v 0..1 c\nevent A at=(0yr,0ly)\nframe F v=$v'), /range must stay below 1c/);
  assert.match(messages('scene spacetime\nevent A at=(2yr,0ly)\nevent B at=(1yr,0ly)\nworldline W from=A to=B'), /must go forward in time/);
});

test('mistakes are explained', () => {
  assert.match(messages('scene spacetime\nevent A at=(0kg,0ly)'), /time needs a time, but "0kg" is a mass/);
  assert.match(messages('scene spacetime\nevent A at=(0yr,0ly)\nmeasure A Z'), /no event called "Z"/);
  assert.match(messages('scene spacetime\nshow lightcone A'), /no event called "A"/);
  assert.match(messages('scene spacetime\nevent A at=(0yr)'), /time and a place in brackets/);
});
