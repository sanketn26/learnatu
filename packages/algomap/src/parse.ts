import { AlgoSyntaxError, PAINTS } from './types.ts';
import type { Diagram, Flash, Frame, GraphEdge, Kept, NTree, Paint, Problem, StructKind, StructState, Structure } from './types.ts';
import { list, suggest, tokenize } from '@learnatu/textmap-core';
import type { Token } from '@learnatu/textmap-core';
import { attach, cloneFrameState, detach, hashKey, initialState, isAlive, pathKey, rotate, subtree } from './model.ts';

/**
 * Reads the text of an ```algo block into a Diagram. See the README for the language.
 * `parseAlgo` never throws: it returns the diagram (when there are no mistakes) and every problem it found.
 * `parse` throws an AlgoSyntaxError instead. `check` returns just the problems.
 * The library never runs an algorithm: every frame is exactly what the author's `step` lines say.
 */
export interface ParseResult { diagram: Diagram | null; problems: Problem[] }

const ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NODE_NAME = /^[A-Za-z0-9_]+$/;
const REF = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[([^\]]*)\]|\.([A-Za-z0-9_]+))?$/;
const PART = /^(\d+)(?:\.\.(\d+))?$/;
const DECLARATIONS = ['array', 'list', 'stack', 'queue', 'grid', 'hash', 'tree', 'trie', 'graph', 'vars'];
const FLASH_OPS: Record<string, Flash> = { compare: 'compare', focus: 'focus' };
const KEEP_OPS: Record<string, Kept> = { done: 'done', visit: 'visit' };
const OPS = ['compare', 'focus', 'done', 'visit', 'unmark', 'swap', 'set', 'clear', 'append', 'remove', 'push', 'pop', 'enqueue', 'dequeue',
  'insert', 'add', 'move', 'detach', 'rotate', 'paint', 'tag', 'weight', 'pointer', 'unpointer', 'path', 'reset'];
const KEYWORDS = ['title', 'step', 'place', ...DECLARATIONS, ...OPS];
const LINEAR = ['array', 'list', 'stack', 'queue', 'tree'];
const POINTABLE = ['array', 'list', 'queue', 'tree'];
const NODE_TREES = ['ntree', 'trie'];
const MAX_CELLS = 40;
const MAX_TREE_SLOTS = 63;
const MAX_NODES = 24;
const MAX_TREE_NODES = 60;
const MAX_CHAIN = 90;

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

interface Resolved { id: string; indexes: number[]; whole: boolean; range: boolean }

/** Reads `n1`, `n1=label` or `n1="a b"` into an id and a label. */
function idAndLabel(token: Token): { id: string; label: string } | null {
  let id = token.key ?? token.text;
  let label = token.key ? token.text : token.text;
  if (!token.key && !token.quoted && token.text.includes('=')) {
    const at = token.text.indexOf('=');
    id = token.text.slice(0, at); label = token.text.slice(at + 1);
  } else if (!token.key) { id = token.text; label = token.text; }
  return NODE_NAME.test(id) ? { id, label } : null;
}

/** Reads the text of a node-link tree: `5(2(1 3) 8)`, with `_` for an empty child slot and `id="label"` for names that are not ids. */
function parseNested(src: string, line: number, fail: (line: number, message: string) => void): { tree: NTree; labels: string[] } | null {
  const tree: NTree = { ids: [], children: [], roots: [], terminal: [] };
  const labels: string[] = [];
  let i = 0;
  let ok = true;
  const bad = (message: string) => { if (ok) fail(line, message); ok = false; };
  const skip = () => { while (i < src.length && /[\s,]/.test(src[i])) i++; };
  const quoted = (): string => {
    let out = '';
    i++;
    while (i < src.length && src[i] !== '"') { if (src[i] === '\\' && i + 1 < src.length) i++; out += src[i++]; }
    if (src[i] !== '"') bad('a quote is opened but never closed'); else i++;
    return out;
  };
  const word = (): string => {
    let out = '';
    while (i < src.length && !/[\s,()="#]/.test(src[i])) out += src[i++];
    return out;
  };
  const node = (): number => {
    let id = '';
    let label = '';
    if (src[i] === '"') { label = quoted(); bad(`A quoted label needs a short name first: n1="${label}"`); return -1; }
    id = word();
    if (!id) { bad(`Unexpected "${src[i] ?? 'end of line'}" in the tree`); return -1; }
    label = id;
    if (src[i] === '=') {
      i++;
      label = src[i] === '"' ? quoted() : word();
    }
    if (!NODE_NAME.test(id)) { bad(`"${id}" cannot be a node name. Use letters, digits and _ , or write a name and a label: n1="${id}"`); return -1; }
    if (tree.ids.includes(id)) { bad(`Two nodes are called "${id}". Give each its own name: n2=${label.includes(' ') ? `"${label}"` : label}`); return -1; }
    if (tree.ids.length >= MAX_TREE_NODES) { bad(`A tree can have ${MAX_TREE_NODES} nodes at most`); return -1; }
    const at = tree.ids.length;
    tree.ids.push(id); labels.push(label); tree.children.push([]);
    if (src[i] === '(') {
      i++;
      for (;;) {
        skip();
        if (!ok) return at;
        if (i >= src.length) { bad('A "(" is never closed with ")"'); return at; }
        if (src[i] === ')') { i++; break; }
        if (src[i] === '_' && /[\s,)]|$/.test(src[i + 1] ?? '')) { i++; tree.children[at].push(-1); continue; }
        const child = node();
        if (child < 0) return at;
        tree.children[at].push(child);
      }
      while (tree.children[at].length && tree.children[at][tree.children[at].length - 1] === -1) tree.children[at].pop();
    }
    return at;
  };
  for (;;) {
    skip();
    if (i >= src.length || src[i] === '#') break;
    if (src[i] === ')') { bad('A ")" has no "(" before it'); break; }
    const root = node();
    if (root < 0 || !ok) break;
    tree.roots.push(root);
  }
  if (!ok) return null;
  if (!tree.roots.length) { fail(line, 'A tree needs at least one node: tree t: 5(2 8)'); return null; }
  return { tree, labels };
}

export function parseAlgo(source: string): ParseResult {
  const problems: Problem[] = [];
  const fail = (line: number, message: string) => { problems.push({ line, message }); };

  const structures = new Map<string, Structure>();
  const frames: Frame[] = [];
  let title: string | undefined;
  let state: Record<string, StructState> = {};
  let step: { caption: string; line: number } | null = null;
  let started = false;

  const startFrames = () => {
    if (started) return;
    started = true;
    for (const s of structures.values()) {
      if (s.kind === 'graph' && s.positions) {
        s.positions.length = s.values.length;
        for (let i = 0; i < s.values.length; i++) if (!s.positions[i]) s.positions[i] ??= null;
        const missing = s.values.filter((_, i) => !s.positions![i]);
        if (missing.length && missing.length < s.values.length) fail(s.line, `Graph "${s.id}": place every node or none. Missing: ${list(missing as string[])}.`);
      }
    }
    state = Object.fromEntries([...structures.values()].map((s) => [s.id, initialState(s)]));
    frames.push({ caption: 'The starting state', line: 1, state: cloneFrameState(state) });
  };
  const finishStep = () => {
    if (step) frames.push({ caption: step.caption, line: step.line, state: cloneFrameState(state) });
    step = null;
  };

  const isNT = (s: Structure) => NODE_TREES.includes(s.kind);
  const allIndexes = (s: Structure, st: StructState): number[] => {
    if (s.kind === 'graph' || s.kind === 'vars') return s.values.map((_, i) => i);
    if (isNT(s)) return st.values.map((_, i) => i).filter((i) => isAlive(st.values, i));
    if (s.kind === 'hash') return (st.chains ?? []).flatMap((c, b) => [hashKey(b), ...c.map((_, k) => hashKey(b, k))]);
    return st.values.map((_, i) => i);
  };
  const example = (s: Structure): string => {
    switch (s.kind) {
      case 'grid': return `${s.id}[0,0]`;
      case 'hash': return `${s.id}[0:0]`;
      case 'graph': case 'vars': return `${s.id}.${s.values[0] ?? 'a'}`;
      case 'ntree': case 'trie': return `${s.id}.${s.ntree?.ids[0] ?? 'a'}`;
      default: return `${s.id}[0]`;
    }
  };
  const live = (st: StructState) => st.ntree!.ids.filter((_, i) => isAlive(st.values, i));

  /** Reads a cell: `a[3]`, `a[1..4]`, `g[1,2]`, `g[0..2,1]`, `h[2]`, `h[2:0]`, `g.node`, `s.top`, `q.front`. */
  const resolve = (token: Token | undefined, line: number, what: string, opts: { range?: boolean; whole?: boolean; grow?: boolean } = {}): Resolved | null => {
    if (!token) { fail(line, `${what} needs a cell, for example a[0]`); return null; }
    const m = REF.exec(token.text);
    if (!m) { fail(line, `"${token.text}" is not a cell. Write a[0], a[1..3], g[1,2], h[2:0], or for a graph or tree, g.name.`); return null; }
    const [, id, inner, dot] = m;
    const s = structures.get(id);
    if (!s) { fail(line, `There is no structure called "${id}".${suggest(id, [...structures.keys()])} Declare it above the first step.`); return null; }
    const st = state[id];
    const nodeKind = s.kind === 'graph' || s.kind === 'vars' || isNT(s);

    if (inner === undefined && dot === undefined) {
      if (!opts.whole) { fail(line, `${what} needs a cell, for example ${example(s)}`); return null; }
      return { id, indexes: allIndexes(s, st), whole: true, range: false };
    }
    if (dot !== undefined) {
      if (nodeKind) {
        const names = s.kind === 'graph' || s.kind === 'vars' ? (s.values as string[]) : st.ntree!.ids;
        const at = names.findIndex((n, i) => n === dot && (s.kind === 'graph' || s.kind === 'vars' || isAlive(st.values, i)));
        if (at < 0) {
          const pool = s.kind === 'graph' || s.kind === 'vars' ? (s.values as string[]) : live(st);
          fail(line, `${s.kind === 'vars' ? 'Variables' : s.kind === 'graph' ? `Graph "${id}"` : `Tree "${id}"`} has no ${s.kind === 'vars' ? 'variable' : 'node'} "${dot}".${suggest(dot, pool)} Its ${s.kind === 'vars' ? 'variables' : 'nodes'}: ${list(pool)}.`);
          return null;
        }
        return { id, indexes: [at], whole: false, range: false };
      }
      const len = st.values.length;
      const words: Record<string, number | undefined> = s.kind === 'list' ? { head: 0, tail: len - 1 } : s.kind === 'stack' ? { top: len - 1 } : s.kind === 'queue' ? { front: 0, back: len - 1 } : {};
      if (!(dot in words)) {
        fail(line, Object.keys(words).length ? `"${id}.${dot}" is not a cell. Use ${Object.keys(words).map((w) => `${id}.${w}`).join(' or ')}.` : `"${id}" is ${s.kind === 'hash' ? 'a hash table' : `a ${s.kind}`}, so write ${example(s)}.`);
        return null;
      }
      if (len === 0) { fail(line, `${id} is empty at this step, so it has no ${dot}`); return null; }
      return { id, indexes: [words[dot]!], whole: false, range: false };
    }
    // inner: in brackets
    if (nodeKind) { fail(line, `"${id}" ${s.kind === 'graph' ? 'is a graph' : s.kind === 'vars' ? 'holds variables' : 'is a tree of named nodes'}, so name one: ${example(s)}`); return null; }
    if (s.kind === 'grid') {
      const parts = inner.split(',').map((p) => PART.exec(p.trim()));
      if (parts.length !== 2 || parts.some((p) => !p)) { fail(line, `"${token.text}": a grid cell needs a row and a column, like ${id}[1,2] or ${id}[0..2,1]`); return null; }
      const [r0, r1] = [Number(parts[0]![1]), Number(parts[0]![2] ?? parts[0]![1])];
      const [c0, c1] = [Number(parts[1]![1]), Number(parts[1]![2] ?? parts[1]![1])];
      if (r1 < r0 || c1 < c0) { fail(line, `"${token.text}": a range goes backwards`); return null; }
      const isRange = r1 > r0 || c1 > c0 || /\.\./.test(inner);
      if (isRange && !opts.range) { fail(line, `${what} needs a single cell, not a range`); return null; }
      if (r1 >= s.rows! || c1 >= s.cols!) { fail(line, `"${token.text}" is outside grid ${id}, which has ${s.rows} rows and ${s.cols} columns (counting from 0).`); return null; }
      const indexes = range(r0, r1).flatMap((r) => range(c0, c1).map((c) => r * s.cols! + c));
      return { id, indexes, whole: false, range: isRange };
    }
    if (s.kind === 'hash') {
      const hm = /^(\d+)(?::(\d+))?$/.exec(inner.trim());
      if (!hm) { fail(line, `"${token.text}": a hash cell is a bucket, ${id}[2], or an item in its chain, ${id}[2:0]`); return null; }
      const b = Number(hm[1]);
      const chains = st.chains!;
      if (b >= chains.length) { fail(line, `"${token.text}": hash ${id} has ${chains.length} buckets (0 to ${chains.length - 1}).`); return null; }
      if (hm[2] === undefined) return { id, indexes: [hashKey(b)], whole: false, range: false };
      const k = Number(hm[2]);
      if (k >= chains[b].length) { fail(line, `"${token.text}": bucket ${b} holds ${chains[b].length} item${chains[b].length === 1 ? '' : 's'} at this step (0 to ${Math.max(chains[b].length - 1, 0)}).`); return null; }
      return { id, indexes: [hashKey(b, k)], whole: false, range: false };
    }
    const pm = PART.exec(inner.trim());
    if (!pm) { fail(line, `"${token.text}" is not a cell. Write ${id}[3] or ${id}[1..4].`); return null; }
    const a = Number(pm[1]);
    const b = pm[2] === undefined ? a : Number(pm[2]);
    if (b < a) { fail(line, `"${token.text}": the range goes backwards. Write ${id}[${b}..${a}].`); return null; }
    if (pm[2] !== undefined && !opts.range) { fail(line, `${what} needs a single cell, not a range`); return null; }
    const len = st.values.length;
    const limit = s.kind === 'tree' && opts.grow ? MAX_TREE_SLOTS : len;
    if (b >= limit) {
      fail(line, `"${token.text}" is outside ${id}, which has ${len} ${s.kind === 'tree' ? 'slots' : 'cells'} (0 to ${Math.max(len - 1, 0)}) at this step.`);
      return null;
    }
    return { id, indexes: range(a, b), whole: false, range: pm[2] !== undefined };
  };

  /** Moves marks, tags and pointers after a cell is removed from the middle of an array, list, stack or queue. */
  const shiftAfterRemove = (st: StructState, at: number) => {
    const move = <T>(map: Record<number, T>) => {
      const next: Record<number, T> = {};
      for (const [k, v] of Object.entries(map)) { const i = Number(k); if (i < at) next[i] = v; else if (i > at) next[i - 1] = v; }
      return next;
    };
    st.kept = move(st.kept); st.tags = move(st.tags); st.paint = move(st.paint);
    st.flash = {};
    for (const [name, i] of Object.entries(st.pointers)) { if (i === at) delete st.pointers[name]; else if (i > at) st.pointers[name] = i - 1; }
  };

  const lines = source.split('\n');
  lines.forEach((raw, n) => {
    const line = n + 1;
    const nested = /^\s*tree\s+([A-Za-z_][A-Za-z0-9_]*)\s*:(.*)$/.exec(raw);
    if (nested) {
      if (started) { fail(line, `Declare every ${DECLARATIONS.join(', ')} before the first step. Move this line up.`); return; }
      if (structures.has(nested[1])) { fail(line, `"${nested[1]}" is already used on line ${structures.get(nested[1])!.line}`); return; }
      const parsed = parseNested(nested[2], line, fail);
      if (parsed) structures.set(nested[1], { id: nested[1], kind: 'ntree', line, values: parsed.labels, edges: [], ntree: parsed.tree });
      return;
    }
    const { tokens, error } = tokenize(raw);
    if (error) { fail(line, error); return; }
    if (!tokens.length) return;
    const head = tokens[0];
    if (head.quoted || head.key) { fail(line, `A line starts with a word like step, array or swap, not ${head.quoted ? `"${head.text}"` : head.text}`); return; }
    const word = head.text;
    const args = tokens.slice(1);

    if (word === 'title') {
      if (args.length !== 1) fail(line, 'title needs one piece of text: title "Bubble sort"');
      else title = args[0].text;
      return;
    }

    if (DECLARATIONS.includes(word)) {
      if (started) { fail(line, `Declare every ${DECLARATIONS.join(', ')} before the first step. Move this line up.`); return; }
      declare(word as StructKind, args, line);
      return;
    }

    if (word === 'place') {
      if (started) { fail(line, 'place goes before the first step, with the declarations'); return; }
      place(args, line);
      return;
    }

    if (word === 'step') {
      startFrames();
      finishStep();
      if (args.length !== 1 || !args[0].quoted) { fail(line, 'step needs a caption in quotes: step "Compare the first two"'); step = { caption: '', line }; }
      else step = { caption: args[0].text, line };
      for (const st of Object.values(state)) { st.flash = {}; st.paths = []; }
      return;
    }

    if (!OPS.includes(word)) {
      fail(line, `"${word}" is not something this language knows.${suggest(word, KEYWORDS)} Lines start with one of ${list(KEYWORDS)}.`);
      return;
    }
    if (!step) { fail(line, `"${word}" changes the picture, so it goes under a step line, for example: step "Compare the first two"`); return; }
    operate(word, args, line);
  });

  /** Pulls `key=value` settings out of a declaration. Quoted values arrive with a key; plain ones are one word. */
  function settings(args: Token[], known: string[], line: number, kind: string): { attrs: Record<string, string>; rest: Token[] } {
    const attrs: Record<string, string> = {};
    const rest: Token[] = [];
    for (const t of args) {
      const plain = !t.key && !t.quoted ? /^([a-z]+)=(.*)$/.exec(t.text) : null;
      const key = t.key ?? (plain && known.includes(plain[1]) ? plain[1] : undefined);
      if (key === undefined) { rest.push(t); continue; }
      if (!known.includes(key)) { fail(line, `"${key}=" is not a setting of ${kind}.${known.length ? ` The settings are ${known.map((k) => `${k}=`).join(', ')}.` : ''}`); continue; }
      attrs[key] = t.key ? t.text : plain![2];
    }
    return { attrs, rest };
  }

  function declare(kind: StructKind, args: Token[], line: number) {
    const known = kind === 'grid' ? ['label', 'fill', 'rows', 'cols'] : kind === 'vars' ? [] : ['label'];
    const { attrs, rest } = kind === 'vars' ? { attrs: {} as Record<string, string>, rest: args } : settings(args, known, line, kind);
    let first = rest[0]?.text ?? '';
    const colon = first.endsWith(':');
    if (colon) first = first.slice(0, -1);
    const label = attrs.label;
    if (!ID.test(first)) { fail(line, `${kind} needs a name made of letters, digits and _, for example: ${kind} ${kind === 'graph' ? 'g: a -- b' : kind === 'grid' ? 'g 3 4' : kind === 'vars' ? 'v sum=0' : 'a 5 2 9'}`); return; }
    const existing = structures.get(first);

    if (kind === 'graph') {
      if (!colon) { fail(line, `After the name of a graph put a colon: graph ${first}: a -- b`); return; }
      declareGraph(first, rest.slice(1).map((t) => t.text), label, line);
      return;
    }
    if (existing) { fail(line, `"${first}" is already used on line ${existing.line}`); return; }

    if (kind === 'trie') { declareTrie(first, rest.slice(1), label, line); return; }
    if (kind === 'vars') { declareVars(first, rest.slice(1), line); return; }
    if (kind === 'grid') { declareGrid(first, rest.slice(1), attrs, line); return; }
    if (kind === 'hash') { declareHash(first, rest.slice(1), label, line); return; }

    const cells = rest.slice(1);
    const max = kind === 'tree' ? MAX_TREE_SLOTS : MAX_CELLS;
    const mayBeEmpty = kind === 'stack' || kind === 'queue';
    if (!cells.length && !mayBeEmpty) { fail(line, `${kind} ${first} needs its values after the name, for example: ${kind} ${first} 5 2 9${kind === 'tree' ? '   (or tree t: 5(2 8) to write the nodes out)' : ''}`); return; }
    if (cells.length > max) { fail(line, `${kind} ${first} has ${cells.length} values. The most is ${max}.`); return; }
    const values = cells.map((t) => (!t.quoted && t.text === '_' ? null : t.text));
    if (kind === 'tree') {
      if (values[0] === null) { fail(line, `The first value of a tree is its root, so it cannot be "_"`); return; }
      values.forEach((v, i) => {
        if (v !== null && i > 0 && values[(i - 1) >> 1] === null) fail(line, `Slot ${i} (${v}) has no parent: slot ${(i - 1) >> 1} is empty ("_"). Every value needs a parent above it.`);
      });
    }
    structures.set(first, { id: first, kind, label, line, values, edges: [] });
  }

  function declareGraph(id: string, parts: string[], label: string | undefined, line: number) {
    if (!parts.length) { fail(line, `graph ${id}: needs at least one node, for example: graph ${id}: a -- b`); return; }
    let g = structures.get(id);
    if (g && g.kind !== 'graph') { fail(line, `"${id}" is already a ${g.kind}`); return; }
    if (!g) { g = { id, kind: 'graph', label, line, values: [], edges: [] }; structures.set(id, g); }
    else if (label) g.label = label;
    const graph = g;
    const node = (name: string): number => {
      if (!NODE_NAME.test(name)) { fail(line, `"${name}" is not a node name. Use letters, digits and _.`); return -1; }
      let at = (graph.values as string[]).indexOf(name);
      if (at < 0) {
        if (graph.values.length >= MAX_NODES) { fail(line, `A graph can have ${MAX_NODES} nodes at most`); return -1; }
        graph.values.push(name); at = graph.values.length - 1;
      }
      return at;
    };
    if (parts.length % 2 === 0) { fail(line, 'A link line alternates node and link: a -- b -> c, or with weights: a -3- b -5> c'); return; }
    let previous = node(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      const op = parts[i];
      let directed: boolean, weight: string | undefined;
      let m: RegExpExecArray | null;
      if (op === '--') directed = false;
      else if (op === '->') directed = true;
      else if ((m = /^-([^-<>][^<>]*)-$/.exec(op))) { directed = false; weight = m[1]; }
      else if ((m = /^-([^-<>][^<>]*)>$/.exec(op))) { directed = true; weight = m[1]; }
      else { fail(line, `"${op}" is not a link. Use -- for a plain link, -> for one-way, -3- or -3> to give it a weight.`); return; }
      const next = node(parts[i + 1]);
      if (previous < 0 || next < 0) return;
      const edge: GraphEdge = { from: previous, to: next, directed, ...(weight !== undefined ? { weight } : {}) };
      graph.edges.push(edge);
      previous = next;
    }
  }

  function declareTrie(id: string, words: Token[], label: string | undefined, line: number) {
    const tree: NTree = { ids: ['root'], children: [[]], roots: [0], terminal: [] };
    const labels = [''];
    for (const w of words) {
      if (!/^[A-Za-z0-9]+$/.test(w.text)) { fail(line, `"${w.text}" is not a word for a trie. Use letters and digits.`); return; }
      let at = 0;
      for (let i = 1; i <= w.text.length; i++) {
        const prefix = w.text.slice(0, i);
        let child = tree.children[at].find((c) => tree.ids[c] === prefix);
        if (child === undefined) {
          if (prefix === 'root') { fail(line, '"root" names the top of the trie, so no word can start with it'); return; }
          if (tree.ids.length >= MAX_TREE_NODES) { fail(line, `A trie can have ${MAX_TREE_NODES} nodes at most`); return; }
          child = tree.ids.length;
          tree.ids.push(prefix); labels.push(prefix[i - 1]); tree.children.push([]);
          tree.children[at].push(child);
        }
        at = child;
      }
      if (!tree.terminal.includes(at)) tree.terminal.push(at);
    }
    structures.set(id, { id, kind: 'trie', label, line, values: labels, edges: [], ntree: tree });
  }

  function declareVars(id: string, parts: Token[], line: number) {
    if (!parts.length) { fail(line, `vars ${id} needs at least one variable, for example: vars ${id} sum=0 count=0`); return; }
    const names: string[] = [];
    const init: (string | null)[] = [];
    for (const t of parts) {
      const plain = !t.key && !t.quoted ? /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(t.text) : null;
      const name = t.key ?? plain?.[1] ?? (!t.quoted && ID.test(t.text) ? t.text : undefined);
      const value = t.key ? t.text : plain ? plain[2] : '';
      if (!name || !ID.test(name)) { fail(line, `"${t.text}" is not a variable. Write name=value, for example sum=0.`); return; }
      if (names.includes(name)) { fail(line, `Variable "${name}" is written twice`); return; }
      names.push(name); init.push(value === '' || (!t.quoted && value === '_') ? null : value);
    }
    if (names.length > 12) { fail(line, 'vars can hold 12 variables at most'); return; }
    structures.set(id, { id, kind: 'vars', line, values: names, init, edges: [] });
  }

  function declareGrid(id: string, rest: Token[], attrs: Record<string, string>, line: number) {
    const r = Number(rest[0]?.text), c = Number(rest[1]?.text);
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 1 || c < 1) { fail(line, `grid needs a number of rows and of columns, for example: grid ${id} 3 4`); return; }
    if (r > 20 || c > 20 || r * c > 200) { fail(line, 'A grid can have 20 rows, 20 columns and 200 cells at most'); return; }
    const cells = rest.slice(2).map((t) => (!t.quoted && t.text === '_' ? null : t.text));
    if (cells.length > r * c) { fail(line, `grid ${id} has room for ${r * c} cells (${r} x ${c}) but ${cells.length} values were written`); return; }
    const fill = attrs.fill === undefined || attrs.fill === '_' ? null : attrs.fill;
    const values = [...cells, ...Array.from({ length: r * c - cells.length }, () => fill)];
    const names = (key: 'rows' | 'cols', count: number) => {
      if (attrs[key] === undefined) return undefined;
      const parts = attrs[key].split(/\s+/).filter(Boolean);
      if (parts.length !== count) { fail(line, `${key}="…" needs ${count} names, one for each ${key === 'rows' ? 'row' : 'column'}, but has ${parts.length}`); return undefined; }
      return parts;
    };
    structures.set(id, { id, kind: 'grid', label: attrs.label, line, values, edges: [], rows: r, cols: c, rowNames: names('rows', r), colNames: names('cols', c) });
  }

  function declareHash(id: string, rest: Token[], label: string | undefined, line: number) {
    const n = Number(rest[0]?.text);
    if (!Number.isInteger(n) || n < 1 || n > 16) { fail(line, `hash needs a number of buckets from 1 to 16, for example: hash ${id} 5`); return; }
    const chains: string[][] = Array.from({ length: n }, () => []);
    for (const t of rest.slice(1)) {
      const m = /^(\d+):(.+)$/.exec(t.text);
      if (!m || Number(m[1]) >= n) { fail(line, `"${t.text}" is not an item. Write bucket:value, for example 2:apple, with a bucket from 0 to ${n - 1}.`); return; }
      chains[Number(m[1])].push(m[2]);
    }
    structures.set(id, { id, kind: 'hash', label, line, values: [], edges: [], chains });
  }

  function place(args: Token[], line: number) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z0-9_]+)$/.exec(args[0]?.text ?? '');
    const x = Number(args[1]?.text), y = Number(args[2]?.text);
    if (!m || args.length !== 3 || !Number.isFinite(x) || !Number.isFinite(y)) { fail(line, 'place needs a node and two numbers: place g.a 0 1  (x to the right, y downwards)'); return; }
    const g = structures.get(m[1]);
    if (!g || g.kind !== 'graph') { fail(line, `There is no graph called "${m[1]}" above this line.${suggest(m[1], [...structures.keys()])}`); return; }
    const at = (g.values as string[]).indexOf(m[2]);
    if (at < 0) { fail(line, `Graph "${g.id}" has no node "${m[2]}".${suggest(m[2], g.values as string[])}`); return; }
    g.positions ??= [];
    while (g.positions.length < g.values.length) g.positions.push(null);
    g.positions[at] = { x, y };
  }

  function operate(word: string, args: Token[], line: number) {
    const flash = FLASH_OPS[word];
    const keep = KEEP_OPS[word];
    const kindOf = (r: Resolved) => structures.get(r.id)!.kind;
    const single = (r: Resolved) => r.indexes[0];

    if (flash || keep || word === 'unmark') {
      if (!args.length) { fail(line, `${word} needs one or more cells, for example: ${word} a[0] a[1]`); return; }
      for (const t of args) {
        const r = resolve(t, line, word, { range: true, whole: true });
        if (!r) continue;
        const st = state[r.id];
        for (const i of r.indexes) {
          if (flash) st.flash[i] = flash;
          else if (keep) st.kept[i] = keep;
          else delete st.kept[i];
        }
      }
      return;
    }

    switch (word) {
      case 'swap': {
        if (args.length !== 2) { fail(line, 'swap needs two cells: swap a[0] a[1]'); return; }
        const a = resolve(args[0], line, 'swap'), b = resolve(args[1], line, 'swap');
        if (!a || !b) return;
        const ok = (r: Resolved) => [...LINEAR, 'grid', 'vars'].includes(kindOf(r));
        if (!ok(a) || !ok(b)) { fail(line, `swap works on the cells of an array, list, stack, queue, tree, grid or on variables, not on a ${[a, b].map(kindOf).find((k) => ![...LINEAR, 'grid', 'vars'].includes(k))}`); return; }
        const sa = state[a.id], sb = state[b.id];
        [sa.values[single(a)], sb.values[single(b)]] = [sb.values[single(b)], sa.values[single(a)]];
        sa.flash[single(a)] = 'changed'; sb.flash[single(b)] = 'changed';
        return;
      }
      case 'set': {
        if (args.length !== 2) { fail(line, 'set needs a cell and a value: set a[1] 7'); return; }
        const r = resolve(args[0], line, 'set', { grow: true });
        if (!r) return;
        const kind = kindOf(r);
        const st = state[r.id];
        const value = !args[1].quoted && args[1].text === '_' ? null : args[1].text;
        const at = single(r);
        if (kind === 'graph') { fail(line, 'A graph node has no value to set. Use tag g.a "text" to write next to it, or weight to change a link.'); return; }
        if (kind === 'hash') {
          const k = at % 100 - 1;
          if (k < 0) { fail(line, 'set changes an item in a chain, for example set h[2:0] pear. To add an item use insert.'); return; }
          st.chains![Math.floor(at / 100)][k] = args[1].text;
        } else if (isNT(structures.get(r.id)!)) {
          if (value === null) { fail(line, 'A node needs a label. To take it away use remove.'); return; }
          st.values[at] = value;
        } else {
          while (st.values.length <= at) st.values.push(null);
          st.values[at] = value;
          if (kind === 'tree' && value !== null && at > 0 && st.values[(at - 1) >> 1] === null) fail(line, `Slot ${at} has no parent: slot ${(at - 1) >> 1} is empty. Fill the parent first.`);
        }
        st.flash[at] = 'changed';
        return;
      }
      case 'clear': {
        if (args.length !== 1) { fail(line, 'clear needs one cell: clear t[3]'); return; }
        const r = resolve(args[0], line, 'clear');
        if (!r) return;
        if (![...LINEAR, 'grid', 'vars'].includes(kindOf(r))) { fail(line, `clear empties a cell of an array, list, stack, queue, tree, grid or a variable. For a ${kindOf(r)} use remove.`); return; }
        state[r.id].values[single(r)] = null;
        state[r.id].flash[single(r)] = 'changed';
        return;
      }
      case 'append': {
        if (args.length !== 2) { fail(line, 'append needs a structure and a value: append a 7'); return; }
        const r = resolve(args[0], line, 'append', { whole: true });
        if (!r) return;
        const s = structures.get(r.id)!;
        if (!r.whole || !['array', 'list', 'tree'].includes(s.kind)) { fail(line, `append adds at the end of an array, list or tree: append a 7.${s.kind === 'stack' ? ' For a stack use push.' : s.kind === 'queue' ? ' For a queue use enqueue.' : ''}`); return; }
        const st = state[r.id];
        if (st.values.length >= (s.kind === 'tree' ? MAX_TREE_SLOTS : MAX_CELLS)) { fail(line, `${r.id} is full`); return; }
        st.values.push(args[1].text);
        st.flash[st.values.length - 1] = 'changed';
        return;
      }
      case 'push': case 'enqueue': {
        const want = word === 'push' ? 'stack' : 'queue';
        if (args.length !== 2) { fail(line, `${word} needs a ${want} and a value: ${word} ${want[0]} 7`); return; }
        const r = resolve(args[0], line, word, { whole: true });
        if (!r) return;
        if (kindOf(r) !== want || !r.whole) { fail(line, `${word} works on a ${want}${kindOf(r) === 'stack' ? '. A queue uses enqueue and dequeue' : kindOf(r) === 'queue' ? '. A stack uses push and pop' : ''}`); return; }
        const st = state[r.id];
        if (st.values.length >= MAX_CELLS) { fail(line, `${r.id} is full`); return; }
        st.values.push(args[1].text);
        st.flash[st.values.length - 1] = 'changed';
        return;
      }
      case 'pop': case 'dequeue': {
        const want = word === 'pop' ? 'stack' : 'queue';
        if (args.length !== 1) { fail(line, `${word} needs a ${want}: ${word} ${want[0]}`); return; }
        const r = resolve(args[0], line, word, { whole: true });
        if (!r) return;
        if (kindOf(r) !== want || !r.whole) { fail(line, `${word} works on a ${want}`); return; }
        const st = state[r.id];
        if (!st.values.length) { fail(line, `${r.id} is empty at this step, so there is nothing to ${word}`); return; }
        const at = word === 'pop' ? st.values.length - 1 : 0;
        st.values.splice(at, 1);
        shiftAfterRemove(st, at);
        return;
      }
      case 'remove': {
        if (args.length !== 1) { fail(line, 'remove needs one cell or node: remove a[2], remove h[1:0], remove t.x'); return; }
        const r = resolve(args[0], line, 'remove');
        if (!r) return;
        const s = structures.get(r.id)!;
        const st = state[r.id];
        if (['array', 'list', 'stack', 'queue'].includes(s.kind)) {
          st.values.splice(single(r), 1);
          shiftAfterRemove(st, single(r));
        } else if (s.kind === 'hash') {
          const key = single(r);
          if (key % 100 === 0) { fail(line, 'remove takes an item out of a chain, for example remove h[2:0]. A bucket stays.'); return; }
          st.chains![Math.floor(key / 100)].splice(key % 100 - 1, 1);
          st.flash = {};
          for (const k of ['kept', 'tags', 'paint'] as const) {
            const next: Record<number, never> = {};
            for (const [kk, v] of Object.entries(st[k])) { const n = Number(kk); if (Math.floor(n / 100) !== Math.floor(key / 100) || n < key) next[n] = v as never; else if (n > key) next[n - 1] = v as never; }
            (st as unknown as Record<string, unknown>)[k] = next;
          }
        } else if (isNT(s)) {
          const nt = st.ntree!;
          const gone = subtree(nt, single(r));
          detach(nt, single(r));
          for (const g of gone) { st.values[g] = null; delete st.kept[g]; delete st.tags[g]; delete st.paint[g]; delete st.flash[g]; nt.terminal = nt.terminal.filter((x) => x !== g); }
        } else { fail(line, `remove works on arrays, lists, stacks, queues, hash chains and trees of named nodes. For a ${s.kind} use clear.`); return; }
        return;
      }
      case 'insert': {
        if (args.length !== 2) { fail(line, 'insert needs a place and a value: insert h[2] apple   or   insert t word (for a trie)'); return; }
        const r = resolve(args[0], line, 'insert', { whole: true });
        if (!r) return;
        const s = structures.get(r.id)!;
        const st = state[r.id];
        if (s.kind === 'hash') {
          if (r.whole || single(r) % 100 !== 0) { fail(line, 'insert goes into a bucket: insert h[2] apple'); return; }
          const b = single(r) / 100;
          if (st.chains![b].length >= MAX_CHAIN) { fail(line, `Bucket ${b} is full`); return; }
          st.chains![b].push(args[1].text);
          st.flash[hashKey(b, st.chains![b].length - 1)] = 'changed';
        } else if (s.kind === 'trie') {
          if (!r.whole) { fail(line, `insert adds a word to the whole trie: insert ${r.id} word`); return; }
          const word0 = args[1].text;
          if (!/^[A-Za-z0-9]+$/.test(word0)) { fail(line, `"${word0}" is not a word for a trie. Use letters and digits.`); return; }
          const nt = st.ntree!;
          let at = 0;
          for (let i = 1; i <= word0.length; i++) {
            const prefix = word0.slice(0, i);
            let child = nt.children[at].find((c) => nt.ids[c] === prefix && isAlive(st.values, c));
            if (child === undefined) {
              if (prefix === 'root') { fail(line, '"root" names the top of the trie, so no word can start with it'); return; }
              if (nt.ids.length >= MAX_TREE_NODES) { fail(line, `A trie can have ${MAX_TREE_NODES} nodes at most`); return; }
              child = nt.ids.length;
              nt.ids.push(prefix); nt.children.push([]); st.values.push(prefix[i - 1]);
              nt.children[at].push(child);
              st.flash[child] = 'changed';
            }
            at = child;
          }
          if (!nt.terminal.includes(at)) nt.terminal.push(at);
        } else { fail(line, `insert works on a hash table or a trie. For a ${s.kind} use ${s.kind === 'ntree' ? 'add' : s.kind === 'stack' ? 'push' : s.kind === 'queue' ? 'enqueue' : 'append or set'}.`); return; }
        return;
      }
      case 'add': {
        const at = args.find((t) => /^at=\d+$/.test(t.text));
        const rest = args.filter((t) => t !== at);
        if (rest.length !== 2) { fail(line, 'add needs the parent and the new node: add t.parent child   (or add t child for a new root). Optional: at=0'); return; }
        const r = resolve(rest[0], line, 'add', { whole: true });
        if (!r) return;
        const s = structures.get(r.id)!;
        if (!isNT(s)) { fail(line, `add puts a node into a tree written like tree t: 5(2 8). For a ${s.kind} use ${s.kind === 'tree' ? 'set' : 'append'}.`); return; }
        const nt = state[r.id].ntree!;
        const st = state[r.id];
        const il = idAndLabel(rest[1]);
        if (!il) { fail(line, `"${rest[1].text}" cannot be a node name. Use letters, digits and _ , or write a name and a label: n1="10 20"`); return; }
        if (nt.ids.some((x, i) => x === il.id && isAlive(st.values, i))) { fail(line, `There is already a node called "${il.id}"`); return; }
        if (nt.ids.length >= MAX_TREE_NODES) { fail(line, `A tree can have ${MAX_TREE_NODES} nodes at most`); return; }
        const index = nt.ids.length;
        nt.ids.push(il.id); nt.children.push([]); st.values.push(il.label);
        attach(nt, index, r.whole ? -1 : single(r), at ? Number(at.text.slice(3)) : undefined);
        st.flash[index] = 'changed';
        return;
      }
      case 'move': case 'detach': {
        const at = args.find((t) => /^at=\d+$/.test(t.text));
        const rest = args.filter((t) => t !== at);
        if (rest.length !== (word === 'move' ? 2 : 1)) { fail(line, word === 'move' ? 'move needs a node and its new parent: move t.x t.p   (optional at=0)' : 'detach needs a node: detach t.x   (it becomes a root of its own)'); return; }
        const r = resolve(rest[0], line, word);
        const p = word === 'move' ? resolve(rest[1], line, word) : null;
        if (!r || (word === 'move' && !p)) return;
        const s = structures.get(r.id)!;
        if (!isNT(s)) { fail(line, `${word} works on a tree written like tree t: 5(2 8)`); return; }
        if (p && p.id !== r.id) { fail(line, 'move keeps a node inside its own tree'); return; }
        const nt = state[r.id].ntree!;
        if (p && subtree(nt, single(r)).includes(single(p))) { fail(line, `A node cannot move under itself: ${nt.ids[single(p)]} is inside ${nt.ids[single(r)]}`); return; }
        detach(nt, single(r));
        attach(nt, single(r), p ? single(p) : -1, at ? Number(at.text.slice(3)) : undefined);
        state[r.id].flash[single(r)] = 'changed';
        return;
      }
      case 'rotate': {
        if (args.length !== 2 || !['left', 'right'].includes(args[1].text)) { fail(line, 'rotate needs a node and a direction: rotate t.y right  (y\'s left child moves up)'); return; }
        const r = resolve(args[0], line, 'rotate');
        if (!r) return;
        if (!isNT(structures.get(r.id)!)) { fail(line, 'rotate works on a tree written like tree t: 5(2 8)'); return; }
        const st = state[r.id];
        const nt = st.ntree!;
        const y = single(r);
        const x = (nt.children[y] ?? [])[args[1].text === 'right' ? 0 : 1] ?? -1;
        const message = rotate(nt, y, args[1].text as 'left' | 'right', nt.ids);
        if (message) { fail(line, message); return; }
        st.flash[y] = 'changed'; st.flash[x] = 'changed';
        return;
      }
      case 'paint': {
        const colour = args[args.length - 1]?.text;
        if (args.length < 2 || !(colour === '_' || (PAINTS as readonly string[]).includes(colour))) { fail(line, `paint needs cells and a colour: paint t.x red.${colour && colour !== '_' ? suggest(colour, [...PAINTS]) : ''} Colours: ${list(PAINTS)}, or _ to remove it.`); return; }
        for (const t of args.slice(0, -1)) {
          const r = resolve(t, line, 'paint', { range: true, whole: true });
          if (!r) continue;
          for (const i of r.indexes) { if (colour === '_') delete state[r.id].paint[i]; else state[r.id].paint[i] = colour as Paint; }
        }
        return;
      }
      case 'tag': {
        if (args.length !== 2) { fail(line, 'tag needs a cell and a text: tag g.a "0"   (use _ to remove it)'); return; }
        const r = resolve(args[0], line, 'tag');
        if (!r) return;
        if (!args[1].quoted && args[1].text === '_') delete state[r.id].tags[single(r)];
        else state[r.id].tags[single(r)] = args[1].text;
        return;
      }
      case 'pointer': {
        if (args.length !== 2) { fail(line, 'pointer needs a name and a cell: pointer i a[0]'); return; }
        if (!ID.test(args[0].text)) { fail(line, `"${args[0].text}" is not a good pointer name. Use something like i, j, lo, hi, mid.`); return; }
        const r = resolve(args[1], line, 'pointer');
        if (!r) return;
        if (!POINTABLE.includes(kindOf(r))) { fail(line, `Pointers sit under the cells of an array, list, queue or tree. For a ${kindOf(r)} use focus, or tag to write a note.`); return; }
        state[r.id].pointers[args[0].text] = single(r);
        return;
      }
      case 'unpointer': {
        if (args.length !== 2) { fail(line, 'unpointer needs a name and a structure: unpointer i a'); return; }
        const s = structures.get(args[1].text);
        if (!s) { fail(line, `There is no structure called "${args[1].text}".${suggest(args[1].text, [...structures.keys()])}`); return; }
        if (!(args[0].text in state[s.id].pointers)) { fail(line, `${s.id} has no pointer called "${args[0].text}" at this step`); return; }
        delete state[s.id].pointers[args[0].text];
        return;
      }
      case 'path': case 'weight': {
        const isWeight = word === 'weight';
        if (isWeight ? args.length !== 3 : args.length < 2) { fail(line, isWeight ? 'weight needs two nodes and a value: weight g.a g.b 7' : 'path needs two or more nodes: path g.a g.b'); return; }
        const refs = args.slice(0, isWeight ? 2 : undefined).map((t) => resolve(t, line, word));
        if (refs.some((r) => !r)) return;
        const id = refs[0]!.id;
        const g = structures.get(id)!;
        if (g.kind !== 'graph') { fail(line, `${word} works on the links of a graph`); return; }
        for (let i = 0; i + 1 < refs.length; i++) {
          const a = refs[i]!, b = refs[i + 1]!;
          if (a.id !== id || b.id !== id) { fail(line, `${word} must stay inside one graph`); return; }
          const from = single(a), to = single(b);
          const edge = g.edges.find((e) => (e.from === from && e.to === to) || (!e.directed && e.from === to && e.to === from));
          if (!edge) { fail(line, `There is no link from ${g.values[from]} to ${g.values[to]} in graph ${id}`); return; }
          if (isWeight) state[id].weights![pathKey(edge.from, edge.to)] = args[2].text;
          else state[id].paths.push(pathKey(from, to));
        }
        return;
      }
      case 'reset': {
        const targets = args.length ? args.map((t) => (structures.has(t.text) ? t.text : (fail(line, `There is no structure called "${t.text}".${suggest(t.text, [...structures.keys()])}`), null))) : [...structures.keys()];
        for (const id of targets) if (id) { state[id].kept = {}; state[id].pointers = {}; }
        return;
      }
    }
  }

  startFrames();
  finishStep();
  if (!structures.size && !problems.length) fail(1, 'Nothing to draw yet. Start with, for example: array a 5 2 9 1');
  if (problems.length) return { diagram: null, problems: problems.sort((x, y) => x.line - y.line) };
  return { diagram: { title, structures: [...structures.values()], frames }, problems: [] };
}

export function parse(source: string): Diagram {
  const { diagram, problems } = parseAlgo(source);
  if (!diagram) throw new AlgoSyntaxError(problems);
  return diagram;
}

export function check(source: string): Problem[] {
  return parseAlgo(source).problems;
}
