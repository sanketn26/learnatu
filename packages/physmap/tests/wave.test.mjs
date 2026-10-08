import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, EXAMPLES, startValues } from '../src/index.ts';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');
const wave = (body) => `scene wave\n${body}`;

test('every wave example is valid', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'wave')) assert.deepEqual(check(e.text), [], e.id);
});

test('medium decides what is allowed', () => {
  assert.match(messages(wave('medium air\nsource s at=(0m,0m) f=100Hz\npolarise\nrun 2periods')), /longitudinal, so they cannot be polarised/);
  assert.match(messages(wave('medium vacuum\nsource s at=(0m,0m) f=5e14Hz v=(10m/s,0m/s)\nrun 2periods')), /moving source of light needs relativity/);
  assert.match(messages(wave('medium unobtainium\nsource s at=(0m,0m) f=100Hz\nrun 2periods')), /don't know the medium/);
  assert.match(messages(wave('source s at=(0m,0m) f=100Hz\nrun 2periods')), /say what the wave travels in/);
});

test('units: frequency, length and angle are told apart', () => {
  assert.match(messages(wave('medium air\nsource s at=(0m,0m) f=100m\nrun 2periods')), /f needs a frequency, but "100m" is a length/);
  assert.match(messages(wave('medium air\nsource s at=(0m,0m) f=100Hz phase=90\nrun 2periods')), /phase needs a unit: deg or rad/);
});

test('slits: fringe spacing is λL/d, zero at the centre of the minima, bright centre', () => {
  const s = parse(`scene wave\nslits d=0.2mm wavelength=550nm\nscreen at=1.5m`);
  const run = s.run({});
  assert.equal(run.count, 1);
  assert.match(run.caption(0), /4\.1\d mm apart/);
  assert.match(run.svg(0), /^<svg class="pm"/);
});

test('slits: wavelength must be visible light for a colour, sliders move the pattern', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'double-slit').text);
  const a = s.run({ ...startValues(s), wavelength: 400e-9 }).caption(0);
  const b = s.run({ ...startValues(s), wavelength: 700e-9 }).caption(0);
  assert.notEqual(a, b);
});

test('Doppler: caption gives the shifted frequencies, and a Mach cone past the wave speed', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'doppler').text);
  const slow = s.run({ speed: 171.5 });
  assert.match(slow.caption(0), /heard ahead at 200 Hz, behind at 66\.7 Hz/);
  const fast = s.run({ speed: 400 });
  assert.match(fast.caption(0), /Mach 1\.17.*shock cone/);
  assert.match(fast.svg(30), /stroke-dasharray="6 4"/);
});

test('interference: two equal sources give a pattern, with a probe plot', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'interference').text);
  const run = s.run({});
  assert.equal(run.count, 121);
  const svg = run.svg(60);
  assert.match(svg, /pm-heat/);
  assert.match(svg, /pm-series/);
});
