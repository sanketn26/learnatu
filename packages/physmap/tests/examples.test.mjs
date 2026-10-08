import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES, SCENE_KINDS, check, parse, extremeValues, startValues } from '../src/index.ts';

test('every scene kind has at least one example, and ids are unique', () => {
  for (const kind of SCENE_KINDS) assert.ok(EXAMPLES.some((e) => e.kind === kind), `no example for ${kind}`);
  assert.equal(new Set(EXAMPLES.map((e) => e.id)).size, EXAMPLES.length);
});

test('every example is valid, runs at the start and ends of every slider, and draws without NaN', () => {
  for (const e of EXAMPLES) {
    assert.deepEqual(check(e.text), [], e.id);
    const scene = parse(e.text);
    assert.equal(scene.kind, e.kind, `${e.id} kind`);
    for (const values of extremeValues(scene)) {
      const run = scene.run(values);
      assert.ok(run.ok, `${e.id} runs`);
      for (const i of [0, run.count >> 1, run.count - 1]) {
        const svg = run.svg(i);
        assert.ok(!svg.includes('NaN') && !svg.includes('undefined') && !svg.includes('Infinity'), `${e.id} frame ${i} (${JSON.stringify(values)})`);
        assert.ok(run.describe(i).length > 10, `${e.id} describe`);
      }
    }
    assert.ok(scene.title, `${e.id} has a title`);
    void startValues(scene);
  }
});
