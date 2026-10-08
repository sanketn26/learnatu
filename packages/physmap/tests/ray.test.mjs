import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, EXAMPLES, startValues } from '../src/index.ts';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');

test('every ray example is valid', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'ray')) assert.deepEqual(check(e.text), [], e.id);
});

const lens = (u, f = '8cm') => parse(`scene ray\nobject at=${u}cm height=3cm\nlens at=0cm f=${f}`).run({}).caption(0);

test('thin lens: 1/f = 1/u + 1/v, magnification −v/u', () => {
  // object 20 cm away, f = 8 cm: v = 13.33 cm, m = −0.667
  assert.match(lens(-20), /real, inverted, reduced ×0\.667, 13\.3 cm beyond the lens/);
  // object 12 cm away: v = 24 cm, m = −2
  assert.match(lens(-12), /real, inverted, magnified ×2, 24 cm beyond the lens/);
  // object inside the focal length: virtual, upright, magnified
  assert.match(lens(-4), /virtual, upright, magnified ×2, 8 cm on the object side/);
  // object at f: image at infinity
  assert.match(lens(-8), /image is at infinity/);
  // diverging lens: always virtual, upright, reduced
  assert.match(lens(-20, '-8cm'), /virtual, upright, reduced/);
});

test('mirrors: concave mirror reads like the lens, convex mirror is always virtual', () => {
  const m = (u, f) => parse(`scene ray\nobject at=${u}cm height=2cm\nmirror at=0cm f=${f}cm`).run({}).caption(0);
  assert.match(m(-14, 6), /real, inverted, reduced ×0\.75, 10\.5 cm in front of the mirror/);
  assert.match(m(-3, 6), /virtual, upright, magnified ×2, 6 cm behind the mirror/);
  assert.match(m(-14, -6), /virtual, upright, reduced.*behind the mirror/);
});

test('the three principal rays meet at the image tip (drawn solid for real images)', () => {
  const svg = parse(`scene ray\nobject at=-20cm height=3cm\nlens at=0cm f=8cm`).run({}).svg(0);
  assert.equal((svg.match(/class="pm-ray"/g) ?? []).length, 6);
  assert.ok(!/class="pm-ray pm-virtual"/.test(svg));
  const virt = parse(`scene ray\nobject at=-4cm height=3cm\nlens at=0cm f=8cm`).run({}).svg(0);
  assert.match(virt, /class="pm-ray pm-virtual"/);
});

test('refraction: Snell, critical angle, total internal reflection', () => {
  const s = (a, n1, n2) => parse(`scene ray\nbeam angle=${a}deg n1=${n1} n2=${n2}`).run({}).caption(0);
  assert.match(s(30, 1, 1.5), /1 × sin 30° = 1\.5 × sin 19\.5°.*bends towards the normal/);
  assert.match(s(30, 1.5, 1), /bends away from the normal.*Critical angle 41\.8°/);
  assert.match(s(50, 1.5, 1), /Total internal reflection.*past the critical angle \(41\.8°\)/);
});

test('mistakes are explained', () => {
  assert.match(messages('scene ray\nobject at=5cm height=3cm\nlens at=0cm f=8cm'), /object must be in front of the lens/);
  assert.match(messages('scene ray\nobject at=-5cm height=3cm\nlens at=0cm f=0cm'), /f cannot be zero/);
  assert.match(messages('scene ray\nobject at=-5cm height=3cm\nlens at=0cm f=3cm\nbeam angle=30deg n1=1 n2=1.5'), /either an object with a lens or mirror, or a beam/);
  assert.match(messages('scene ray\nbeam angle=30deg n1=0.5 n2=1.5'), /refractive index, which is 1 or more/);
  assert.match(messages('scene ray\nbeam angle=30 n1=1 n2=1.5'), /needs a unit: deg or rad/);
  assert.match(messages('scene ray\nobject at=-5cm height=3cm\nlens at=0cm f=3cm\nlens at=1cm f=2cm'), /one lens or one mirror/);
  assert.match(messages('scene ray\nobject at=-5cm height=3kg\nlens at=0cm f=3cm'), /height needs a length, but "3kg" is a mass/);
});

test('sliders move the image', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'lens').text);
  const near = s.run({ ...startValues(s), u: -0.05 }).caption(0);
  const far = s.run({ ...startValues(s), u: -0.4 }).caption(0);
  assert.notEqual(near, far);
});
