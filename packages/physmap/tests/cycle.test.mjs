import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, EXAMPLES } from '../src/index.ts';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');
const last = (text) => { const run = parse(text).run({}); return run.caption(run.count - 1); };

test('every cycle example is valid', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'cycle')) assert.deepEqual(check(e.text), [], e.id);
});

test('Carnot: the loop closes, efficiency is 1 − Tc/Th = 40%', () => {
  const text = last(EXAMPLES.find((e) => e.id === 'carnot').text);
  assert.match(text, /Closed loop: net work/);
  assert.match(text, /efficiency (39\.\d|40|40\.\d)%/);
});

test('Otto: efficiency is 1 − 1/r^(γ−1) = 56.5% and does not depend on the peak temperature', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'otto').text);
  const eff = (tmax) => { const r = s.run({ tmax }); return r.caption(r.count - 1).match(/efficiency ([\d.]+)%/)?.[1]; };
  assert.match(eff(1800), /^56\.[3-7]/);
  assert.equal(eff(1200), eff(2400));
});

test('first law holds in every process: Q = ΔU + W, isothermal has ΔU = 0, isochoric has W = 0', () => {
  const text = last(`scene cycle\ngas moles=1 p=100kPa T=300K\nprocess isothermal v=0.05m3\nprocess isochoric p=30kPa`);
  assert.match(text, /Process 2, isochoric: heat in .* work by the gas 0 J/);
  const first = parse(`scene cycle\ngas moles=1 p=100kPa T=300K\nprocess isothermal v=0.05m3`).run({}).caption(0);
  assert.match(first, /change in internal energy 0 J/);
});

test('ideal gas: pV = nRT sets the start, and the clock reads p, V and T', () => {
  const run = parse(`scene cycle\ngas moles=1 p=101.325kPa T=273.15K\nprocess isobaric v=0.03m3`).run({});
  assert.match(run.clock(0), /101 kPa, 22\.4 L, 273 K/);
});

test('mistakes are explained', () => {
  assert.match(messages('scene cycle\ngas moles=1 p=100kPa\nprocess isobaric v=0.04m3'), /exactly two of p, v and T/);
  assert.match(messages('scene cycle\ngas moles=1 p=100kPa T=300K\nprocess isobarik v=0.04m3'), /Did you mean "isobaric"\?/);
  assert.match(messages('scene cycle\ngas moles=1 p=100kPa T=300K\nprocess isobaric p=50kPa'), /keeps the pressure fixed/);
  assert.match(messages('scene cycle\ngas moles=1 p=100kPa T=300K\nprocess isothermal v=0.04kg'), /v needs a volume, but "0\.04kg" is a mass/);
  assert.match(messages('scene cycle\ngas moles=1 p=100kPa T=300K gamma=2\nprocess isobaric v=0.04m3'), /never above 1\.67/);
  assert.match(messages('scene cycle\ngas moles=1 p=100kPa T=300K'), /add at least one process/);
  assert.match(messages('scene cycle\ngas moles=1 p=100kPa T=300K\nprocess isobaric v=0.04m3\nnote 3 "x"'), /no process number 3/);
});
