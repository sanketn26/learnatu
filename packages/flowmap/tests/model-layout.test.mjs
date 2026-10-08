import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, layout, rankNodes, findEdge, nodesDownWhenFailing, subLabel } from '../src/index.ts';
import { SAMPLE } from './fixtures.mjs';

test('findEdge honours direction, except for two-way links', () => {
  const d = parse('a -> b\nc <-> d');
  assert.ok(findEdge(d, 'a', 'b'));
  assert.equal(findEdge(d, 'b', 'a'), undefined);
  assert.ok(findEdge(d, 'd', 'c'));
});

test('when a zone fails, only blocks that live only there go down', () => {
  const d = parse(SAMPLE);
  assert.deepEqual(nodesDownWhenFailing(d, 'za'), ['db']);
  assert.deepEqual(nodesDownWhenFailing(d, 'zb'), []);
});

test('when a group fails, everything inside it goes down', () => {
  const d = parse(SAMPLE);
  assert.deepEqual(nodesDownWhenFailing(d, 'k8s').sort(), ['api']);
  assert.deepEqual(nodesDownWhenFailing(d, 'prod').sort(), ['api', 'db', 'egress', 'ingress']);
});

test('sub-labels show replicas and capacity', () => {
  const d = parse(SAMPLE);
  assert.equal(subLabel(d, d.nodes.find((n) => n.id === 'api')), '×3 · cap 200/s');
  assert.equal(subLabel(d, d.nodes.find((n) => n.id === 'customer')), '');
  assert.equal(subLabel(parse('node a "A" sub="custom"'), parse('node a "A" sub="custom"').nodes[0]), 'custom');
});

test('ranks follow the flow, and loops do not break them', () => {
  const ranks = rankNodes(parse('a -> b -> c\nc -> a\na -> c'));
  assert.deepEqual([ranks.get('a'), ranks.get('b'), ranks.get('c')], [0, 1, 2]);
});

test('blocks in later ranks sit further along; none overlap', () => {
  const d = parse(SAMPLE);
  const L = layout(d);
  assert.ok(L.nodes.get('customer').x < L.nodes.get('ingress').x);
  assert.ok(L.nodes.get('ingress').x < L.nodes.get('api').x);
  const rects = [...L.nodes.values()];
  for (const a of rects) for (const b of rects) {
    if (a === b) continue;
    const overlap = Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
    assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
  }
});

test('group boxes contain their members, and nested groups sit inside their parent', () => {
  const d = parse(SAMPLE);
  const L = layout(d);
  const inside = (outer, inner) => Math.abs(inner.x - outer.x) + inner.w / 2 <= outer.w / 2 && Math.abs(inner.y - outer.y) + inner.h / 2 <= outer.h / 2;
  const box = (id) => L.groups.find((g) => g.id === id);
  assert.ok(inside(box('k8s'), L.nodes.get('api')));
  assert.ok(inside(box('prod'), L.nodes.get('db')));
  assert.ok(inside(box('prod'), box('k8s')));
  assert.equal(L.groups.find((g) => g.id === 'za'), undefined); // zones are tags, not boxes
});

test('direction down lays blocks out top to bottom', () => {
  const L = layout(parse('direction down\na -> b -> c'));
  assert.ok(L.nodes.get('a').y < L.nodes.get('b').y && L.nodes.get('b').y < L.nodes.get('c').y);
});

test('several links leaving one side use different points', () => {
  const L = layout(parse('a -> b\na -> c\na -> d'));
  const starts = ['a>b', 'a>c', 'a>d'].map((id) => L.edges.get(id).curve.p1.y);
  assert.equal(new Set(starts.map(Math.round)).size, 3);
});

test('same text gives the same picture', () => {
  assert.deepEqual(layout(parse(SAMPLE)).view, layout(parse(SAMPLE)).view);
});
