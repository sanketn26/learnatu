import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, renderSvg, describe, layout } from '../src/index.ts';
import { BUBBLE, BST, GRAPH } from './fixtures.mjs';

test('every frame of every example draws', () => {
  for (const t of [BUBBLE, BST, GRAPH, 'list l 1 2 3\npointer x l[0]'.replace('pointer', 'step "p"\n  pointer')]) {
    const d = parse(t);
    d.frames.forEach((_, i) => {
      const svg = renderSvg(d, i);
      assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
      assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `frame ${i}`);
    });
  }
});

test('highlights show up as classes', () => {
  const d = parse(BUBBLE);
  assert.match(renderSvg(d, 1), /class="am-cell am-compare"/);
  assert.match(renderSvg(d, 2), /class="am-cell am-changed"/);
  assert.match(renderSvg(d, 4), /class="am-cell am-done/);
  assert.doesNotMatch(renderSvg(d, 0), /class="am-cell am-/);
});

test('text from the author is escaped', () => {
  const d = parse('array a "<b>" 2\nstep "x < y"');
  const svg = renderSvg(d, 1);
  assert.ok(!svg.includes('<b>'));
  assert.match(svg, /&lt;b&gt;/);
});

test('describe says the step, the cells and the pointers', () => {
  const d = parse(BUBBLE);
  const text = describe(d, 1);
  assert.match(text, /Step 1 of 4/);
  assert.match(text, /0: 5 \(compare\)/);
  assert.match(text, /i at 0/);
});

test('layout does not change between frames when a list grows', () => {
  const d = parse('array a 1 2\nstep "grow"\n  append a 3\n  append a 4');
  const w = layout(d).w;
  assert.ok(w >= 4 * 56);
  assert.equal(renderSvg(d, 0).match(/viewBox="[^"]+"/)[0], renderSvg(d, 1).match(/viewBox="[^"]+"/)[0]);
});

test('ids stay unique with a prefix', () => {
  assert.match(renderSvg(parse('array a 1'), 0, { idPrefix: 'x1' }), /id="x1-t"/);
});

import { DP, HASH, AVL, TRIE, DIJKSTRA, FOREST } from './fixtures.mjs';

test('every frame of every new kind draws, with no NaN', () => {
  for (const t of [DP, HASH, AVL, TRIE, DIJKSTRA, FOREST]) {
    const d = parse(t);
    d.frames.forEach((_, i) => {
      const svg = renderSvg(d, i);
      assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `frame ${i}: ${t.split('\n')[0]}`);
      assert.ok(describe(d, i).length > 10);
    });
  }
});

test('the picture keeps one size while a tree is rebuilt', () => {
  const d = parse(AVL);
  const box = (i) => renderSvg(d, i).match(/viewBox="[^"]+"/)[0];
  assert.equal(box(0), box(1));
});

test('paint, tags, weights and word ends reach the picture', () => {
  assert.match(renderSvg(parse(AVL), 1), /style="fill:#d6335a"/);
  assert.match(renderSvg(parse(DIJKSTRA), 2), /class="am-tag"[^>]*>2</);
  assert.match(renderSvg(parse(DIJKSTRA), 2), /class="am-weight"[^>]*>3</);
  assert.match(renderSvg(parse(TRIE), 0), /class="am-ring"/);
});

test('describe covers grids, hash tables, tries and variables', () => {
  assert.match(describe(parse(DP), 1), /Grid dp, row a: 0, 0/);
  assert.match(describe(parse(HASH), 1), /bucket 1.*pear/);
  assert.match(describe(parse(TRIE), 0), /Trie t: start/);
  assert.match(describe(parse(DIJKSTRA), 2), /best = 2/);
});
