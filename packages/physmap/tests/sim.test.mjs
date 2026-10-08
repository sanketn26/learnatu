import test from 'node:test';
import assert from 'node:assert/strict';
import { parseModel as parse, simulate, renderSvg, describe, captionAt } from '../src/mechanics-api.ts';
import { SPRING, THROW, BOUNCE, PENDULUM } from './fixtures.mjs';

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} is not within ${tol} of ${b}`);

test('a throw lands where projectile motion says: range = v² sin(2θ) / g', () => {
  const m = parse(THROW.replace('run 4s', 'run 3.5s'));
  const sim = simulate(m);
  const land = sim.samples.find((s) => s.t > 0.5 && s.b[0][1] <= 1e-9);
  near(land.b[0][0], (20 ** 2 * Math.sin(Math.PI / 2)) / 9.81, 0.3, 'range');
  near(land.t, (2 * 20 * Math.sin(Math.PI / 4)) / 9.81, 0.03, 'time of flight');
});

test('a spring keeps its energy and has period 2π√(m/k)', () => {
  const m = parse(SPRING);
  const sim = simulate(m);
  const e0 = sim.samples[0].energy;
  for (const s of sim.samples) near(s.energy, e0, e0 * 1e-4, 'energy');
  const period = 2 * Math.PI * Math.sqrt(2 / 40);
  const back = sim.samples.reduce((best, s) => (s.t > period * 0.8 && s.t < period * 1.2 && Math.abs(s.b[0][0] - 0.6) < Math.abs(best.b[0][0] - 0.6) ? s : best), sim.samples.at(-1));
  near(back.t, period, 0.1, 'period');
});

test('sliders change the physics', () => {
  const m = parse(SPRING);
  const fast = simulate(m, { k: 100, mass: 0.5 });
  const slow = simulate(m, { k: 10, mass: 5 });
  const crossings = (sim) => sim.samples.filter((s, i) => i && (s.b[0][0] - 0.4) * (sim.samples[i - 1].b[0][0] - 0.4) < 0).length;
  assert.ok(crossings(fast) > crossings(slow) * 3);
});

test('a bouncing ball loses height by the bounce factor squared each time', () => {
  const sim = simulate(parse(BOUNCE));
  const ys = sim.samples.map((s) => s.b[0][1]);
  const peaks = ys.filter((y, i) => i && i < ys.length - 1 && y > ys[i - 1] && y >= ys[i + 1]);
  near((peaks[1] - 0.1) / (peaks[0] - 0.1), 0.64, 0.03, 'each peak is 0.8² of the one before');
  assert.ok(Math.min(...ys) >= 0.1 - 1e-6, 'never sinks below the ground');
});

test('a rod keeps the pendulum at a fixed length and swings with period ≈ 2π√(L/g)', () => {
  const sim = simulate(parse(PENDULUM));
  const length = Math.hypot(0.5, 1.8 - 2.5);
  for (const s of sim.samples) near(Math.hypot(s.b[0][0], s.b[0][1] - 2.5), length, 0.01, 'length');
  const zero = sim.samples.filter((s, i) => i && s.b[0][0] * sim.samples[i - 1].b[0][0] < 0).map((s) => s.t);
  const period = (zero[2] - zero[0]);
  near(period, 2 * Math.PI * Math.sqrt(length / 9.81), 0.12, 'period');
});

test('render: scene, graphs and cursor; text describes the moment', () => {
  const m = parse(SPRING);
  const sim = simulate(m);
  const svg = renderSvg(m, sim, 30, { idPrefix: 'a' });
  assert.match(svg, /^<svg class="pm" id="a"/);
  assert.equal((svg.match(/class="pm-cursor"/g) ?? []).length, 2);
  assert.match(svg, /t = 0\.5 s/);
  assert.match(describe(m, sim, 30), /At 0\.5 seconds: b at x/);
  assert.equal(captionAt(m, 0), 'Pulled out to the right and let go.');
  assert.equal(captionAt(m, 2), 'It speeds up toward the middle.');
});

test('render: pictures are only drawn when the page says where they are', () => {
  const m = parse('scene mechanics\nbody b mass=1kg at=(0m,0m) sprite="b.png"\nbackdrop "r.png" from=(0m,0m) size=(2m,1m)\nrun 1s');
  const sim = simulate(m);
  assert.doesNotMatch(renderSvg(m, sim, 0), /<image/);
  assert.equal((renderSvg(m, sim, 0, { resolveImage: (r) => `/img/${r}` }).match(/<image href="\/img\//g) ?? []).length, 2);
});
