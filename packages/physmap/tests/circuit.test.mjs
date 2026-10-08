import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, EXAMPLES } from '../src/index.ts';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');

test('every circuit example is valid', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'circuit')) assert.deepEqual(check(e.text), [], e.id);
});

test('Ohm: 9 V across 100 Ω + (200 ∥ 300 = 120 Ω) = 220 Ω drives 40.9 mA, drops add to 9 V', () => {
  const run = parse(EXAMPLES.find((e) => e.id === 'series-parallel').text).run({});
  assert.match(run.caption(0), /Total resistance 220 Ω, so the battery drives 0\.0409 A/);
  const svg = run.svg(0);
  assert.match(svg, /drops add up to 9 V of 9 V/);
  assert.match(svg, /R1<\/text>.*4\.09 V|4\.09 V/);
});

test('RC: time constant R·C, 63% charged after one τ, current falls to 37%', () => {
  const s = parse(`scene circuit\nbattery 10V\nresistor R 1000ohm\ncapacitor C 1000uF\nrun 1s`);
  const run = s.run({});
  assert.match(run.caption(0), /time constant RC is 1 s/);
  // at t = 1 s (the last frame) the capacitor holds 10·(1 − 1/e) = 6.32 V
  assert.match(run.caption(run.count - 1), /holds 6\.32 V of the 10 V and the current is 0\.00368 A/);
  assert.match(run.svg(60), /pm-series/);
});

test('sliders change the answer', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'series-parallel').text);
  assert.notEqual(s.run({ volts: 3 }).caption(0), s.run({ volts: 12 }).caption(0));
});

test('mistakes are explained', () => {
  assert.match(messages('scene circuit\nresistor R1 100ohm'), /add a battery/);
  assert.match(messages('scene circuit\nbattery 9A\nresistor R1 100ohm'), /battery needs a voltage, but "9A" is a current/);
  assert.match(messages('scene circuit\nbattery 9V\nresistor R1 100V'), /R1 needs a resistance, but "100V" is a voltage/);
  assert.match(messages('scene circuit\nbattery 9V\nparallel\nresistor R1 10ohm\nend'), /at least two resistors/);
  assert.match(messages('scene circuit\nbattery 9V\nparallel\nresistor R1 10ohm\nresistor R2 10ohm'), /never closed with "end"/);
  assert.match(messages('scene circuit\nbattery 9V\nresistor R1 10ohm\nrun 1s'), /only makes sense with a capacitor/);
  assert.match(messages('scene circuit\nbattery 9V\nresistor R1 10ohm\nresistor R1 20ohm'), /already a part called "R1"/);
  assert.match(messages('scene circuit\nbattery 9V\nparallel\ncapacitor C1 1uF\nend'), /capacitor cannot go in a parallel group/);
});
