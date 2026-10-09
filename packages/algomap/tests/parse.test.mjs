import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, check, tokenize, AlgoSyntaxError } from '../src/index.ts';
import { BUBBLE, BST, GRAPH } from './fixtures.mjs';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');

test('the examples have no problems', () => {
  for (const t of [BUBBLE, BST, GRAPH]) assert.deepEqual(check(t), []);
});

test('tokenizer: words, strings, key="value", comments', () => {
  const { tokens } = tokenize('array a 5 "two words" label="Numbers" # nothing');
  assert.deepEqual(tokens.map((t) => [t.text, t.quoted, t.key]), [['array', false, undefined], ['a', false, undefined], ['5', false, undefined], ['two words', true, undefined], ['Numbers', true, 'label']]);
  assert.match(tokenize('step "oops').error, /never closed/);
});

test('one frame for the start and one per step', () => {
  const d = parse(BUBBLE);
  assert.equal(d.frames.length, 5);
  assert.equal(d.title, 'Bubble sort, one pass');
  assert.deepEqual(d.frames[0].state.a.values, ['5', '2', '9', '1']);
});

test('swap changes values only from its step on, and flashes clear on the next step', () => {
  const d = parse(BUBBLE);
  assert.deepEqual(d.frames[1].state.a.values, ['5', '2', '9', '1']);
  assert.deepEqual(d.frames[2].state.a.values, ['2', '5', '9', '1']);
  assert.deepEqual(d.frames[2].state.a.flash, { 0: 'changed', 1: 'changed' });
  assert.deepEqual(d.frames[3].state.a.flash, { 1: 'compare', 2: 'compare' });
  assert.deepEqual(d.frames[4].state.a.kept, { 3: 'done' });
  assert.equal(d.frames[3].state.a.pointers.i, 1);
});

test('frames are separate copies', () => {
  const d = parse(BUBBLE);
  assert.notEqual(d.frames[1].state.a, d.frames[2].state.a);
  assert.deepEqual(d.frames[1].state.a.values, ['5', '2', '9', '1']);
});

test('trees are level-order, "_" is empty, and set can grow them', () => {
  const d = parse(BST);
  assert.equal(d.frames[2].state.t.values[5], '6');
  assert.equal(d.frames[2].state.t.values[3], null);
});

test('graphs: nodes in order of appearance, links, lit paths', () => {
  const d = parse(GRAPH);
  const g = d.structures[0];
  assert.deepEqual(g.values, ['a', 'b', 'c', 'd']);
  assert.deepEqual(g.edges.map((e) => [e.from, e.to, e.directed]), [[0, 1, false], [1, 2, false], [0, 3, true]]);
  assert.deepEqual(d.frames[2].state.g.paths, ['0>1']);
  assert.deepEqual(d.frames[2].state.g.kept, { 0: 'visit' });
});

test('remove shifts later cells, marks and pointers', () => {
  const d = parse('array a 1 2 3 4\nstep "x"\n  done a[3]\n  pointer p a[2]\n  remove a[1]');
  assert.deepEqual(d.frames[1].state.a.values, ['1', '3', '4']);
  assert.deepEqual(d.frames[1].state.a.kept, { 2: 'done' });
  assert.equal(d.frames[1].state.a.pointers.p, 1);
});

test('mistakes come with a line and a suggestion', () => {
  assert.match(messages('array a 1 2\nstep "x"\n  swop a[0] a[1]'), /3: .*Did you mean "swap"/);
  assert.match(messages('array a 1 2\nstep "x"\n  swap a[0] a[5]'), /3: .*outside a/);
  assert.match(messages('array arr 1 2\nstep "x"\n  swap ar[0] arr[1]'), /3: .*no structure called "ar".*Did you mean "arr"/);
  assert.match(messages('array a 1 2\nswap a[0] a[1]'), /2: .*under a step/);
  assert.match(messages('array a 1 2\nstep "x"\narray b 3'), /3: .*before the first step/);
  assert.match(messages('array a 1 2\nstep first'), /2: step needs a caption in quotes/);
  assert.match(messages('tree t 1 _ _ 4'), /1: .*no parent/);
  assert.match(messages('graph g: a -- b\nstep "x"\n  path g.a g.c'), /3: .*no node "c"/);
  assert.match(messages('graph g: a -- b -- c\nstep "x"\n  path g.a g.c'), /3: .*no link from a to c/);
  assert.match(messages('graph g: a -> b\nstep "x"\n  path g.b g.a'), /3: .*no link from b to a/);
  assert.match(messages(''), /Nothing to draw/);
  assert.match(messages('array a 1\narray a 2'), /2: .*already used on line 1/);
});

test('parse throws AlgoSyntaxError listing every problem', () => {
  assert.throws(() => parse('array a 1\nstep "x"\n  nope\n  swap a[0]'), (e) => e instanceof AlgoSyntaxError && e.problems.length === 2);
});

import { DP, HASH, AVL, TRIE, DIJKSTRA, FOREST } from './fixtures.mjs';

test('the richer examples have no problems', () => {
  for (const t of [DP, HASH, AVL, TRIE, DIJKSTRA, FOREST]) assert.deepEqual(check(t), [], t);
});

test('grids: cells by row and column, ranges, fill, names', () => {
  const d = parse(DP);
  const g = d.structures[0];
  assert.equal(g.rows, 3); assert.equal(g.cols, 4);
  assert.deepEqual(g.rowNames, ['a', 'b', 'c']);
  assert.equal(d.frames[1].state.dp.values[1 * 4 + 2], '5');
  assert.equal(d.frames[1].state.dp.values[0], '0');
  assert.deepEqual(Object.keys(d.frames[1].state.dp.flash).map(Number), [1, 5, 6]);
});

test('stacks and queues: push, pop, enqueue, dequeue, top and front', () => {
  const d = parse(DP);
  assert.deepEqual(d.frames[1].state.s.values, ['1', '2', '3']);
  assert.deepEqual(d.frames[1].state.q.values, ['7', '8', '9']);
  assert.deepEqual(d.frames[2].state.s.values, ['1', '2']);
  assert.deepEqual(d.frames[2].state.q.values, ['8', '9']);
  assert.equal(d.frames[2].state.s.flash[1], 'focus');
  assert.equal(d.frames[2].state.q.flash[0], 'focus');
  assert.match(messages('stack s\nstep "x"\n  pop s'), /3: .*empty/);
});

test('hash tables: buckets, chains, insert, remove', () => {
  const d = parse(HASH);
  assert.deepEqual(d.frames[0].state.h.chains, [[], ['apple', 'fig'], [], ['kiwi']]);
  assert.deepEqual(d.frames[1].state.h.chains[1], ['apple', 'fig', 'pear']);
  assert.equal(d.frames[1].state.h.flash[102 + 1 - 1 + 1], 'changed'); // bucket 1, item 2
  assert.deepEqual(d.frames[2].state.h.chains[1], ['apple', 'pear']);
  assert.match(messages('hash h 2\nstep "x"\n  remove h[0:0]'), /3: .*holds 0 items/);
});

test('node-link trees: rotation keeps every node and moves the right ones', () => {
  const d = parse(AVL);
  const nt = d.frames[1].state.t.ntree;
  const id = (i) => nt.ids[i];
  assert.deepEqual(nt.roots.map(id), ['20']);
  assert.deepEqual(nt.children[nt.ids.indexOf('20')].map((i) => (i < 0 ? '_' : id(i))), ['10', '30']);
  assert.deepEqual(nt.children[nt.ids.indexOf('10')], []);
  assert.equal(d.frames[1].state.t.paint[nt.ids.indexOf('20')], 'black');
  assert.equal(d.frames[1].state.t.paint[nt.ids.indexOf('10')], 'red');
  assert.match(messages('tree t: 1(2)\nstep "x"\n  rotate t.2 right'), /3: 2 has no left child/);
  assert.deepEqual(check('tree t: 1(2)\nstep "x"\n  rotate t.1 right\n  rotate t.2 left'), []);
});

test('forests: move, detach, add with a slot, ids with labels', () => {
  const d = parse(FOREST);
  const first = d.frames[1].state.uf.ntree;
  assert.deepEqual(first.roots.map((i) => first.ids[i]), ['1']);
  const last = d.frames[2].state.uf.ntree;
  assert.deepEqual(last.roots.map((i) => last.ids[i]), ['1', '5', '6']);
  assert.equal(d.frames[2].state.uf.values[last.ids.indexOf('6')], 'six');
  assert.deepEqual(last.children[last.ids.indexOf('6')].map((i) => (i < 0 ? '_' : last.ids[i])), ['_', '7']);
  assert.match(messages('tree t: 1(2)\nstep "x"\n  move t.1 t.2'), /3: .*inside/);
  assert.match(messages('tree t: 1(1)'), /1: .*Two nodes are called "1"/);
  assert.match(messages('tree t: "10 20"(1)'), /1: .*short name/);
  assert.deepEqual(check('tree t: n1="10 20"(a="3 5" b="30 35")'), []);
});

test('tries: words become prefix nodes, insert adds the missing ones', () => {
  const d = parse(TRIE);
  const a = d.frames[0].state.t.ntree;
  assert.deepEqual(a.ids, ['root', 'c', 'ca', 'cat', 'car']);
  assert.deepEqual(a.terminal.map((i) => a.ids[i]), ['cat', 'car']);
  const b = d.frames[1].state.t.ntree;
  assert.deepEqual(b.ids.slice(5), ['d', 'do', 'dog']);
  assert.ok(b.terminal.includes(b.ids.indexOf('dog')));
  assert.equal(d.frames[1].state.t.flash[b.ids.indexOf('dog')], 'changed');
});

test('weighted graphs, fixed positions, tags and variables', () => {
  const d = parse(DIJKSTRA);
  const g = d.structures[0];
  assert.deepEqual(g.edges.map((e) => e.weight), ['4', '1', '2']);
  assert.deepEqual(g.positions, [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }]);
  assert.equal(d.frames[1].state.g.tags[0], '0');
  assert.equal(d.frames[2].state.g.weights['0>2'], '3');
  assert.deepEqual(d.frames[0].state.v.values, ['0', null]);
  assert.equal(d.frames[2].state.v.values[1], '2');
  assert.match(messages('graph g: a -- b\nplace g.a 0 0\nstep "x"'), /place every node or none/);
});

test('tags and paint work on any structure and stay until changed', () => {
  const d = parse('array a 1 2\nstep "x"\n  tag a[0] "min"\n  paint a[1] red\nstep "y"\n  tag a[0] _');
  assert.equal(d.frames[1].state.a.tags[0], 'min');
  assert.equal(d.frames[2].state.a.tags[0], undefined);
  assert.equal(d.frames[2].state.a.paint[1], 'red');
  assert.match(messages('array a 1\nstep "x"\n  paint a[0] reed'), /Did you mean "red"/);
});

test('mistakes in the new kinds say what to write instead', () => {
  assert.match(messages('grid g 2 2\nstep "x"\n  set g[2,0] 1'), /3: .*outside grid g/);
  assert.match(messages('grid g 2 2\nstep "x"\n  set g[1] 1'), /3: .*row and a column/);
  assert.match(messages('hash h 2\nstep "x"\n  insert h apple'), /3: .*bucket/);
  assert.match(messages('array a 1\nstep "x"\n  push a 2'), /3: .*works on a stack/);
  assert.match(messages('array a 1\nstep "x"\n  pointer p a[0]\nstack s 1'), /4: .*before the first step/);
  assert.match(messages('stack s 1\nstep "x"\n  pointer p s[0]'), /3: .*Pointers sit under/);
  assert.match(messages('vars v sum=0\nstep "x"\n  set v.sun 1'), /3: .*no variable "sun".*Did you mean "sum"/);
});

test('size sets the cell width and height exactly, and rejects what it cannot size', () => {
  const base = 'array a 3 1 2\nsize a w=80 h=60\nstep "go"\nswap a[0] a[1]\n';
  const d = parse(base);
  assert.deepEqual(d.structures[0].cell, { w: 80, h: 60 });
  assert.deepEqual(check(base), []);
  assert.match(check('array a 1 2\nsize a w=5\nstep "x"\n')[0].message, /pixels from 28 to 200/);
  assert.match(check('graph g: a -- b\nsize g w=60\nstep "x"\n')[0].message, /works on arrays/);
  assert.match(check('array a 1 2\nstep "x"\nsize a w=60\n')[0].message, /before the first step/);
});
