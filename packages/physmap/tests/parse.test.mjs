import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, parseQuantity, parseUnit, dimName, tokenize, PhysSyntaxError } from '../src/index.ts';
import { parseModel } from '../src/mechanics-api.ts';
import { SPRING, THROW, BOUNCE, PENDULUM } from './fixtures.mjs';

/** Quantities from parseQuantity carry a numeric value; the type also allows plain text. */
const valueOf = (text) => /** @type {{ value: number }} */ (parseQuantity(text)).value;
const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');
const wrap = (body) => `scene mechanics\n${body}\nrun 1s`;

test('the examples have no problems', () => {
  for (const t of [SPRING, THROW, BOUNCE, PENDULUM]) assert.deepEqual(check(t), []);
});

test('units convert to SI and keep their dimension', () => {
  assert.equal(valueOf('2kg'), 2);
  assert.equal(valueOf('500g'), 0.5);
  assert.equal(valueOf('3cm'), 0.03);
  assert.equal(valueOf('9.8m/s2'), 9.8);
  assert.deepEqual(parseUnit('N/m').dim, { L: 0, M: 1, T: -2, I: 0, K: 0 });
  assert.deepEqual(parseUnit('kg*m/s2').dim, parseUnit('N').dim);
  assert.ok(Math.abs(valueOf('180deg') - Math.PI) < 1e-12);
  assert.equal(parseUnit('furlong'), null);
  assert.equal(dimName({ L: 1, M: 0, T: 0, I: 0, K: 0 }), 'a length');
});

test('tokenizer drops spaces inside brackets through the parser', () => {
  const m = parseModel(wrap('body b mass=1kg at=(1m, 2m)'));
  assert.deepEqual(m.bodies[0].at, [1, 2]);
  assert.equal(tokenize('title "a (b)"').tokens[1].text, 'a (b)');
});

test('sliders: ranges, units and references', () => {
  const m = parseModel(SPRING);
  assert.deepEqual(m.params.map((p) => [p.name, p.min, p.max, p.start]), [['k', 10, 100, 40], ['mass', 0.5, 5, 2]]);
  assert.deepEqual(m.bodies[0].mass, { param: 'mass' });
  assert.equal(m.notes.length, 2);
  assert.equal(m.predicts[0].answer, 'It grows by about 41%.');
});

test('unit mistakes are said in physics words', () => {
  assert.match(messages(wrap('body b mass=3m at=(0m,0m)')), /1: mass needs a mass, but "3m" is a length|2: mass needs a mass, but "3m" is a length/);
  assert.match(messages(wrap('body b mass=3 at=(0m,0m)')), /needs a mass, so write a unit, for example 3kg/);
  assert.match(messages(wrap('body b mass=1kg at=(0m,0s)')), /second number\) needs a length, but "0s" is a time/);
  assert.match(messages(wrap('param k 1..2 kg\nbody b mass=1kg at=(0m,0m)\nspring k=$k from=(0m,0m) to=b rest=1m')), /needs a spring stiffness, but the slider "k" is a mass/);
});

test('plots cannot mix things that measure different things', () => {
  assert.match(messages(wrap('body b mass=1kg at=(0m,0m)\nplot b.x b.speed')), /different things/);
  assert.deepEqual(check(wrap('body b mass=1kg at=(0m,0m)\nplot b.ke energy')), []);
});

test('helpful messages: typos, missing parts, unknown names, planned scenes', () => {
  assert.match(messages(wrap('body b mas=1kg at=(0m,0m)')), /no property "mas". Did you mean "mass"\?/);
  assert.match(messages(wrap('bodyy b mass=1kg at=(0m,0m)')), /Did you mean "body"\?/);
  assert.match(messages(wrap('body b at=(0m,0m)')), /needs mass=/);
  assert.match(messages('scene waves\nrun 1s'), /don't know a "waves" scene. Did you mean "wave"\?/);
  assert.match(messages('body b mass=1kg at=(0m,0m)\nrun 1s'), /start the block with the kind of scene/);
  assert.match(messages(wrap('body ball mass=1kg at=(0m,0m)\nshow velocity bal')), /no body called "bal". Did you mean "ball"\?/);
  assert.match(messages('scene mechanics\nbody b mass=1kg at=(0m,0m)'), /say how long to run/);
  assert.match(messages(wrap('body b mass=1kg at=(0m,0m)\nnote 5s "late"')), /only lasts 1 s/);
  assert.match(messages(wrap('body b mass=1kg at=(0m,0m)\nplot b.energy')), /for the whole scene/);
});

test('parse throws with every problem and its line', () => {
  try { parse('scene mechanics\nbody\nfoo'); assert.fail('should throw'); } catch (e) {
    assert.ok(e instanceof PhysSyntaxError);
    assert.deepEqual(e.problems.map((p) => p.line), [2, 3]);
  }
});

test('images are checked against the course when asked', () => {
  const text = wrap('body b mass=1kg at=(0m,0m) sprite="ball.png"\nbackdrop "ramp.png" from=(0m,0m) size=(4m,2m)');
  assert.deepEqual(check(text), []);
  const missing = check(text, { hasImage: (ref) => ref === 'ramp.png' });
  assert.deepEqual(missing.map((p) => p.message), ['the picture "ball.png" is not in the course']);
});

test('a scene that blows up is reported', () => {
  const text = wrap('param k 1..1e12 N/m\nbody b mass=0.001kg at=(0.6m,0m)\nspring k=$k from=(0m,0m) to=b rest=0.5m');
  assert.match(messages(text), /runs away/);
});

test('a spring squashed through its own anchor is reported', () => {
  const text = wrap('body b mass=1kg at=(0.5m,0m)\nspring k=40N/m from=(0m,0m) to=b rest=0.2m').replace('run 1s', 'run 3s');
  assert.match(messages(text), /squashed to almost nothing/);
});
