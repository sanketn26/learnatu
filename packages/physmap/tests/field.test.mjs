import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, EXAMPLES } from '../src/index.ts';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');

test('every field example is valid', () => {
  for (const e of EXAMPLES.filter((x) => x.kind === 'field')) assert.deepEqual(check(e.text), [], e.id);
});

test('electric: the midpoint of a dipole has E = 2kq/r², pointing from + to −', () => {
  const s = parse(`scene field\ncharge a at=(-1m,0m) q=3nC\ncharge b at=(1m,0m) q=-3nC\nprobe p at=(0m,0m)`);
  const text = s.run({}).caption(0);
  assert.match(text, /electric field 53\.9 N\/C, pointing 0° from the x axis/);
});

test('gravity: a probe at the surface reads g, pointing at the planet', () => {
  const s = parse(`scene field\nmass earth at=(0m,0m) m=5.97e24kg\nprobe p at=(0m,6.371e6m)`);
  const text = s.run({}).caption(0);
  assert.match(text, /gravitational field 9\.8\d m\/s², pointing -90° from the x axis/);
});

test('drawing: lines, arrows and potential show up when asked for', () => {
  const dipole = EXAMPLES.find((e) => e.id === 'dipole').text;
  const svg = parse(dipole).run({}).svg(0);
  assert.ok(svg.includes('class="pm-line"'));
  assert.ok(!svg.includes('class="pm-pot"'));
  assert.ok(!svg.includes('NaN'));
  const pot = parse(dipole.replace('show lines arrows', 'show potential')).run({}).svg(0);
  assert.ok(pot.includes('class="pm-pot"'));
  assert.ok(!pot.includes('class="pm-line"'));
});

test('sliders change the field', () => {
  const s = parse(EXAMPLES.find((e) => e.id === 'dipole').text);
  assert.notEqual(s.run({ q: 1e-9 }).caption(0), s.run({ q: 8e-9 }).caption(0));
});

test('mistakes: mixed sources, units, nothing to draw, same place', () => {
  assert.match(messages('scene field\ncharge a at=(0m,0m) q=1nC\nmass m at=(1m,0m) m=1kg'), /cannot be mixed/);
  assert.match(messages('scene field\ncharge a at=(0m,0m) q=1kg'), /q needs a charge, but "1kg" is a mass/);
  assert.match(messages('scene field\ntitle "x"'), /add a source/);
  assert.match(messages('scene field\ncharge a at=(0m,0m) q=1nC\ncharge b at=(0m,0m) q=1nC'), /same place/);
  assert.match(messages('scene field\ncharge a at=(0m,0m) q=1nC\nshow wave'), /I can show "lines", "arrows" or "potential"/);
});
