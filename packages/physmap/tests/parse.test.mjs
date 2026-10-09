import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, parse, check, parseQuantity, parseUnit, dimName, tokenize, PhysSyntaxError } from '../src/index.ts';
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

test('check tries mixes of slider ends and points at the slider that causes the trouble', () => {
  // a lens with the object slider able to reach the lens only when "gap" is small and "f" is large? use ray: object must be in front of the lens
  const text = `scene ray
param x -30..-2 cm start=-20
param f 5..40 cm start=10
object at=$x height=2cm
lens at=0cm f=$f
`;
  assert.deepEqual(check(text), []);
  const bad = `scene ray
param x -30..5 cm start=-20
object at=$x height=2cm
lens at=0cm f=10cm
`;
  const problems = check(bad);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 2);
  assert.match(problems[0].message, /"x" at its high end/);
});

test('view pins the picture, caption replaces the words, allow turns a check off', () => {
  const ray = `scene ray
lens at=0cm f=10cm
object at=-30cm height=2cm
caption "My own words"
view x=-40cm..40cm y=-5cm..5cm
`;
  assert.deepEqual(check(ray), []);
  const run = parse(ray).run({});
  assert.equal(run.caption(0), 'My own words');
  const wide = parse(ray.replace('x=-40cm..40cm', 'x=-400cm..400cm')).run({}).svg(0);
  assert.notEqual(run.svg(0), wide);
  assert.match(check('scene ray\nlens at=0cm f=10cm\nobject at=-30cm height=2cm\nview x=5cm..1cm\n')[0].message, /smaller to bigger/);
  assert.match(check('scene field\nview x=0m..1m\n')[0].message, /don't know "view"/);
  const squashed = `scene mechanics
param x 0.01..0.6 m start=0.3
body b mass=1kg at=($x,0m)
spring k=100N/m from=(0m,0m) to=b rest=0.4m
run 2s
`;
  assert.ok(check(squashed).length > 0);
  assert.deepEqual(check(squashed + 'allow squashed\n'), []);
});

test('caption works in every kind of scene', () => {
  for (const e of EXAMPLES) {
    const text = e.text.replace(/^(scene \w+)\n/, '$1\ncaption "Said by the teacher"\n');
    assert.deepEqual(check(text), [], e.id);
    const run = parse(text).run({});
    assert.equal(run.caption(0), 'Said by the teacher', e.id);
  }
});

test('units pins the unit of time instead of choosing one', () => {
  const base = 'scene spacetime\nevent A at=(0yr,0ly)\nevent B at=(0yr,3ly)\nframe S2 v=0.6c\nmeasure A B\n';
  assert.deepEqual(check(base + 'units milliseconds\n'), []);
  const auto = parse(base).run({}).describe(0), pinned = parse(base + 'units milliseconds\n').run({}).describe(0);
  assert.notEqual(auto, pinned);
  assert.match(check(base + 'units fortnights\n')[0].message, /Choose from/);
});
