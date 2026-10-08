import test from 'node:test';
import assert from 'node:assert/strict';
import { parseModel, simulate, renderSvg } from '../src/mechanics-api.ts';
import { check } from '../src/index.ts';

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} is not within ${tol} of ${b}`);
const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');
const at = (sim, t) => sim.samples.reduce((best, s) => (Math.abs(s.t - t) < Math.abs(best.t - t) ? s : best));

const ramp = (friction, start = 9) => `scene mechanics
gravity earth
incline from=(0m,0m) angle=30deg length=10m friction=${friction}
body block mass=2kg at=(${start * Math.cos(Math.PI / 6)}m,${start * Math.sin(Math.PI / 6)}m)
run 2s`;
const along = (s) => s.b[0][0] * Math.cos(Math.PI / 6) + s.b[0][1] * Math.sin(Math.PI / 6);

test('ramp, no friction: a = g sin θ', () => {
  const sim = simulate(parseModel(ramp(0)));
  const t = at(sim, 1);
  near(9 - along(t), 0.5 * 9.81 * Math.sin(Math.PI / 6) * t.t ** 2, 0.02, 'distance slid');
});

test('ramp with friction: a = g (sin θ − μ cos θ)', () => {
  const sim = simulate(parseModel(ramp(0.2)));
  const t = at(sim, 1);
  near(9 - along(t), 0.5 * 9.81 * (Math.sin(Math.PI / 6) - 0.2 * Math.cos(Math.PI / 6)) * t.t ** 2, 0.02, 'distance slid');
});

test('ramp with enough friction (μ > tan θ): the block stays put', () => {
  const sim = simulate(parseModel(ramp(0.7)));
  near(along(sim.samples.at(-1)), 9, 0.005, 'position');
});

test('on a ramp the normal force is m g cos θ and friction at rest is m g sin θ', () => {
  const sim = simulate(parseModel(ramp(0.7)));
  const row = sim.samples[30].b[0];
  near(Math.hypot(row[7], row[8]), 2 * 9.81 * Math.cos(Math.PI / 6), 0.01, 'normal');
  near(Math.hypot(row[9], row[10]), 2 * 9.81 * Math.sin(Math.PI / 6), 0.01, 'friction');
  near(Math.hypot(row[4], row[5]), 0, 1e-6, 'net force');
});

test('sliding on a floor stops after v²/(2 μ g) in time v/(μ g)', () => {
  const m = parseModel(`scene mechanics\ngravity earth\nground y=0m friction=0.25\nbody b mass=1kg at=(0m,0m) v=(5m/s,0m/s)\nrun 4s`);
  const sim = simulate(m);
  near(sim.samples.at(-1).b[0][0], 25 / (2 * 0.25 * 9.81), 0.02, 'stopping distance');
  near(at(sim, 1).b[0][2], 5 - 0.25 * 9.81 * 1, 0.02, 'speed after 1 s');
  near(sim.samples.at(-1).b[0][2], 0, 1e-6, 'finally still');
});

test('a body resting on the floor: normal force = weight, so the net force is zero', () => {
  const sim = simulate(parseModel(`scene mechanics\ngravity earth\nground y=0m\nbody b mass=3kg at=(0m,0m)\nrun 1s`));
  const row = sim.samples[30].b[0];
  near(row[8], 3 * 9.81, 0.01, 'normal');
  near(row[5], 0, 1e-6, 'net');
  near(sim.weight[0], 3 * 9.81, 1e-9, 'weight');
});

const cart = (e, m2 = 1) => `scene mechanics\ncollide bounce=${e}\nbody a mass=1kg at=(0m,0m) v=(2m/s,0m/s) radius=0.1m\nbody b mass=${m2}kg at=(1m,0m) radius=0.1m\nrun 2s\nplot momentum`.replace('plot momentum', 'plot px');

test('elastic collision of equal masses: they swap velocities, momentum and energy are conserved', () => {
  const sim = simulate(parseModel(cart(1)));
  const end = sim.samples.at(-1);
  near(end.b[0][2], 0, 1e-6, 'a stops');
  near(end.b[1][2], 2, 1e-6, 'b moves on');
  for (const s of sim.samples) near(s.b[0][11] + s.b[1][11], 2, 1e-9, 'momentum');
  near(sim.samples[0].energy, end.energy, 1e-9, 'energy');
});

test('inelastic collision (bounce 0): the two move on together at the shared velocity m1 v1 / (m1 + m2)', () => {
  const sim = simulate(parseModel(cart(0, 3)));
  const end = sim.samples.at(-1);
  near(end.b[0][2], 0.5, 1e-6, 'a');
  near(end.b[1][2], 0.5, 1e-6, 'b');
  assert.ok(end.energy < sim.samples[0].energy * 0.3, 'kinetic energy is lost');
});

test('elastic collision of a light body with a heavy one bounces it back (v₁′ = (m1 − m2)/(m1 + m2) v1)', () => {
  const sim = simulate(parseModel(cart(1, 3)));
  near(sim.samples.at(-1).b[0][2], -1, 1e-6, 'light body');
  near(sim.samples.at(-1).b[1][2], 1, 1e-6, 'heavy body');
});

test('drawing: ramp, angle, free-body arrows and the momentum graph', () => {
  const m = parseModel(`${ramp(0.7)}\nshow weight normal friction\nplot block.normal block.friction`);
  const svg = renderSvg(m, simulate(m), 30);
  assert.match(svg, /class="pm-wedge"/);
  assert.match(svg, />30°</);
  for (const label of ['>W<', '>N<', '>f<']) assert.ok(svg.includes(label), label);
  assert.ok(!svg.includes('NaN'));
});

test('mistakes are explained', () => {
  assert.match(messages('scene mechanics\ncollide\nbody a mass=1kg at=(0m,0m)\nrun 1s'), /bodies that collide need a size: add radius/);
  assert.match(messages('scene mechanics\nbody a mass=1kg at=(0m,0m)\nshow normal\nrun 1s'), /normal force and friction need something to rest on/);
  assert.match(messages('scene mechanics\nincline from=(0m,0m) angle=0deg length=3m\nbody a mass=1kg at=(0m,0m)\nrun 1s'), /between 0° and 90°/);
  assert.match(messages('scene mechanics\nground friction=-1\nbody a mass=1kg at=(0m,0m)\nrun 1s'), /friction is a number from 0/);
  assert.match(messages('scene mechanics\nbody a mass=1kg at=(0m,0m)\nshow weigth\nrun 1s'), /Did you mean "weight"\?/);
  assert.match(messages('scene mechanics\nincline from=(0m,0m) angle=30deg\nbody a mass=1kg at=(0m,0m)\nrun 1s'), /incline needs length=/);
});

test('the floor goes on forever in both directions, so a block that slides off a ramp lands on it', () => {
  const sim = simulate(parseModel(`scene mechanics
gravity earth
incline from=(0m,0m) angle=30deg length=4m
ground y=0m friction=0.3
body block mass=1kg slide=3m
run 6s`));
  for (const s of sim.samples) assert.ok(s.b[0][1] >= -1e-6, `never below the floor (y = ${s.b[0][1]} at ${s.t})`);
  const end = sim.samples.at(-1).b[0];
  assert.ok(end[0] < -1, 'slid out past the foot of the ramp');
  near(end[2], 0, 1e-6, 'and stopped');
});
