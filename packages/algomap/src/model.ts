import type { Frame, NTree, StructState, Structure } from './types.ts';

export const HASH_KEY = 100;
/** The highlight key of a hash table's bucket, or of item `item` in its chain (item -1 is the bucket itself). */
export const hashKey = (bucket: number, item = -1) => bucket * HASH_KEY + 1 + item;

const cloneNTree = (t: NTree): NTree => ({ ids: [...t.ids], children: t.children.map((c) => [...c]), roots: [...t.roots], terminal: [...t.terminal] });

export function initialState(s: Structure): StructState {
  const st: StructState = { values: s.kind === 'vars' ? [...(s.init ?? [])] : [...s.values], flash: {}, kept: {}, pointers: {}, paths: [], tags: {}, paint: {} };
  if (s.chains) { st.chains = s.chains.map((c) => [...c]); st.values = []; }
  if (s.ntree) st.ntree = cloneNTree(s.ntree);
  if (s.kind === 'graph') st.weights = {};
  return st;
}

export function cloneState(s: StructState): StructState {
  const c: StructState = { values: [...s.values], flash: { ...s.flash }, kept: { ...s.kept }, pointers: { ...s.pointers }, paths: [...s.paths], tags: { ...s.tags }, paint: { ...s.paint } };
  if (s.chains) c.chains = s.chains.map((x) => [...x]);
  if (s.ntree) c.ntree = cloneNTree(s.ntree);
  if (s.weights) c.weights = { ...s.weights };
  return c;
}

export function cloneFrameState(state: Record<string, StructState>): Record<string, StructState> {
  return Object.fromEntries(Object.entries(state).map(([id, s]) => [id, cloneState(s)]));
}

/** The largest number of cells or slots a structure ever has, so the drawing does not jump between frames. */
export function maxLength(s: Structure, frames: Frame[]): number {
  return frames.reduce((n, f) => Math.max(n, f.state[s.id]?.values.length ?? 0), s.values.length);
}

export function usesPointers(s: Structure, frames: Frame[]): boolean {
  return frames.some((f) => Object.keys(f.state[s.id]?.pointers ?? {}).length > 0);
}

/** The longest chain each bucket of a hash table ever has. */
export function maxChains(s: Structure, frames: Frame[]): number[] {
  const out = (s.chains ?? []).map((c) => c.length);
  for (const f of frames) (f.state[s.id]?.chains ?? []).forEach((c, b) => { out[b] = Math.max(out[b] ?? 0, c.length); });
  return out;
}

/** Level of a slot in a level-order tree: 0 for the root, 1 for its children, and so on. */
export const treeLevel = (index: number) => Math.floor(Math.log2(index + 1));

export function pathKey(from: number, to: number) { return `${from}>${to}`; }

// ---- node-link trees ----

export const isAlive = (values: (string | null)[], i: number) => values[i] !== null && values[i] !== undefined;

export function parentOf(t: NTree, i: number): number {
  return t.children.findIndex((kids) => kids.includes(i));
}

export function subtree(t: NTree, i: number): number[] {
  const out: number[] = [];
  const walk = (n: number) => { out.push(n); (t.children[n] ?? []).forEach((c) => { if (c >= 0) walk(c); }); };
  walk(i);
  return out;
}

const trim = (slots: number[]) => { while (slots.length && slots[slots.length - 1] === -1) slots.pop(); };

/** Takes node `i` out of its parent's slots (or the roots), leaving a gap that is trimmed when it is at the end. */
export function detach(t: NTree, i: number) {
  const p = parentOf(t, i);
  const slots = p >= 0 ? t.children[p] : t.roots;
  const at = slots.indexOf(i);
  if (at >= 0) { slots[at] = -1; trim(slots); }
}

/** Puts node `i` in slot `at` of parent `p` (or among the roots when p is -1). A gap is filled; otherwise the others shift right. */
export function attach(t: NTree, i: number, p: number, at?: number) {
  const slots = p >= 0 ? t.children[p] : t.roots;
  if (at === undefined) { slots.push(i); return; }
  while (slots.length < at) slots.push(-1);
  if (slots[at] === -1) slots[at] = i; else slots.splice(at, 0, i);
}

/** Moves the left (dir "right") or right (dir "left") child of `y` up into y's place. Returns an error message or null. */
export function rotate(t: NTree, y: number, dir: 'left' | 'right', names: string[]): string | null {
  const side = dir === 'right' ? 0 : 1;
  const other = 1 - side;
  const x = (t.children[y] ?? [])[side] ?? -1;
  if (x < 0) return `${names[y]} has no ${side === 0 ? 'left' : 'right'} child, so it cannot rotate ${dir}`;
  if ((t.children[y] ?? []).length > 2 || (t.children[x] ?? []).length > 2) return 'Rotations work on binary trees: every node has at most two child slots';
  const inner = (t.children[x] ?? [])[other] ?? -1;
  const p = parentOf(t, y);
  const slots = p >= 0 ? t.children[p] : t.roots;
  slots[slots.indexOf(y)] = x;
  while (t.children[x].length <= other) t.children[x].push(-1);
  t.children[x][other] = y;
  while (t.children[y].length <= side) t.children[y].push(-1);
  t.children[y][side] = inner;
  trim(t.children[x]); trim(t.children[y]);
  return null;
}

// ---- layout of node-link trees ----

export const NT_HOLE = 26;
export const NT_GAP = 10;
export const NT_LEVEL = 66;
export const NT_H = 36;
export const ntWidth = (label: string) => Math.max(38, Math.round(label.length * 9.2 + 20));

export interface NTreeLayout { centres: ({ x: number; y: number } | null)[]; widths: number[]; w: number; h: number }

/** Places the nodes of a node-link tree: each node above the middle of its children, forests side by side. */
export function layoutNTree(t: NTree, labels: (string | null)[]): NTreeLayout {
  const widths = labels.map((l) => ntWidth(l ?? ''));
  const span = new Map<number, number>();
  const spanOf = (i: number): number => {
    const cached = span.get(i);
    if (cached !== undefined) return cached;
    const kids = t.children[i] ?? [];
    const total = kids.reduce((sum, c) => sum + (c < 0 ? NT_HOLE : spanOf(c)), 0) + Math.max(0, kids.length - 1) * NT_GAP;
    const s = Math.max(widths[i], total);
    span.set(i, s);
    return s;
  };
  const centres: ({ x: number; y: number } | null)[] = labels.map(() => null);
  let maxDepth = 0;
  const place = (i: number, left: number, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    const kids = t.children[i] ?? [];
    let x = left;
    const real: number[] = [];
    for (const c of kids) {
      if (c < 0) { x += NT_HOLE + NT_GAP; continue; }
      place(c, x, depth + 1);
      real.push(c);
      x += spanOf(c) + NT_GAP;
    }
    centres[i] = real.length
      ? { x: (centres[real[0]]!.x + centres[real[real.length - 1]]!.x) / 2, y: depth * NT_LEVEL + NT_H / 2 }
      : { x: left + spanOf(i) / 2, y: depth * NT_LEVEL + NT_H / 2 };
  };
  let x = 0;
  for (const r of t.roots) { if (r < 0) { x += NT_HOLE + NT_GAP; continue; } place(r, x, 0); x += spanOf(r) + NT_GAP; }
  const live = centres.map((c, i) => (c ? { c, w: widths[i] } : null)).filter((v): v is { c: { x: number; y: number }; w: number } => !!v);
  const minX = Math.min(0, ...live.map((v) => v.c.x - v.w / 2));
  const maxX = Math.max(0, ...live.map((v) => v.c.x + v.w / 2));
  centres.forEach((c) => { if (c) c.x -= minX; });
  return { centres, widths, w: maxX - minX, h: maxDepth * NT_LEVEL + NT_H };
}
