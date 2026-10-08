import type { Diagram, Point, Structure } from './types.ts';
import { hashKey, layoutNTree, maxChains, maxLength, treeLevel, usesPointers } from './model.ts';

/** Where everything goes, worked out once for the whole diagram so the picture does not jump between steps. */
export interface StructLayout {
  id: string; kind: Structure['kind']; x: number; y: number; w: number; h: number;
  /** Centre of each cell, slot or node, by its number. Node-link trees are placed again for every frame. */
  centres: Point[];
  /** Centre of a hash table's buckets and chain items, by highlight key. */
  keyed?: Map<number, Point>;
  /** Cell width and height (arrays, lists, stacks, grids), or the radius (trees, graphs). */
  cw: number; ch: number; r: number;
  /** Y of the index numbers and of the pointer labels (arrays, lists). */
  indexY: number; pointerY: number;
  /** Y of the heading text. */
  headY: number;
  /** Where a list's "null" ends it. */
  tail?: Point;
  /** Width of the numbers at the left of a stack or hash table, or of a grid's row headers. */
  gutter: number;
  /** Height of a grid's column headers. */
  topGutter: number;
}
export interface Layout { w: number; h: number; items: StructLayout[] }

export const CELL_W = 56;
export const CELL_H = 46;
export const VAR_W = 78;
export const LIST_W = 62;
export const LIST_GAP = 30;
export const STACK_W = 76;
export const STACK_H = 36;
export const GRID_W = 48;
export const GRID_H = 40;
export const HASH_ROW = 44;
export const HASH_ITEM_W = 62;
export const HASH_GAP = 24;
export const HEAD = 36;
const PAD = 14;
const GAP = 26;
const TREE_SLOT = 46;
const TREE_LEVEL = 64;
export const NODE_R = 19;
export const UNIT = 84;

export function layoutStructure(s: Structure, frames: Diagram['frames']): StructLayout {
  const n = Math.max(1, maxLength(s, frames));
  const pointers = usesPointers(s, frames);
  const base: StructLayout = { id: s.id, kind: s.kind, x: 0, y: 0, w: 0, h: 0, headY: 14, cw: CELL_W, ch: CELL_H, r: NODE_R, indexY: 0, pointerY: 0, centres: [], gutter: 0, topGutter: 0 };

  if (s.kind === 'array' || s.kind === 'queue' || s.kind === 'vars') {
    const cw = s.kind === 'vars' ? VAR_W : CELL_W;
    const count = s.kind === 'vars' ? s.values.length : n;
    const indexY = HEAD + CELL_H + 16;
    const pointerY = indexY + 22;
    return { ...base, cw, w: count * cw, h: pointerY + (pointers ? 18 : -4), indexY, pointerY,
      centres: Array.from({ length: count }, (_, i) => ({ x: i * cw + cw / 2, y: HEAD + CELL_H / 2 })) };
  }
  if (s.kind === 'list') {
    const top = HEAD + 6;
    const indexY = top + CELL_H + 16;
    const pointerY = indexY + 22;
    const step = LIST_W + LIST_GAP;
    return { ...base, cw: LIST_W, w: n * step + 40, h: pointerY + (pointers ? 18 : -4), indexY, pointerY,
      centres: Array.from({ length: n }, (_, i) => ({ x: i * step + LIST_W / 2, y: top + CELL_H / 2 })),
      tail: { x: n * step + 18, y: top + CELL_H / 2 } };
  }
  if (s.kind === 'stack') {
    const gutter = 34;
    const slots = Math.max(1, maxLength(s, frames));
    return { ...base, cw: STACK_W, ch: STACK_H, gutter, w: gutter + STACK_W + 48, h: HEAD + slots * STACK_H + 8,
      centres: Array.from({ length: slots }, (_, i) => ({ x: gutter + STACK_W / 2, y: HEAD + (slots - 1 - i) * STACK_H + STACK_H / 2 })) };
  }
  if (s.kind === 'grid') {
    const gutter = 40, topGutter = 24;
    const rows = s.rows!, cols = s.cols!;
    return { ...base, cw: GRID_W, ch: GRID_H, gutter, topGutter, w: gutter + cols * GRID_W, h: HEAD + topGutter + rows * GRID_H + 4,
      centres: Array.from({ length: rows * cols }, (_, i) => ({ x: gutter + (i % cols) * GRID_W + GRID_W / 2, y: HEAD + topGutter + Math.floor(i / cols) * GRID_H + GRID_H / 2 })) };
  }
  if (s.kind === 'hash') {
    const chains = maxChains(s, frames);
    const gutter = 0;
    const keyed = new Map<number, Point>();
    chains.forEach((len, b) => {
      const y = HEAD + b * HASH_ROW + HASH_ROW / 2;
      keyed.set(hashKey(b), { x: CELL_W / 2, y });
      for (let k = 0; k < len; k++) keyed.set(hashKey(b, k), { x: CELL_W + HASH_GAP + k * (HASH_ITEM_W + HASH_GAP) + HASH_ITEM_W / 2, y });
    });
    const longest = Math.max(0, ...chains);
    return { ...base, gutter, keyed, cw: HASH_ITEM_W, ch: HASH_ROW - 8,
      w: CELL_W + (longest ? HASH_GAP + longest * (HASH_ITEM_W + HASH_GAP) - 6 : 0) + 24, h: HEAD + chains.length * HASH_ROW + 4 };
  }
  if (s.kind === 'tree') {
    const levels = treeLevel(n - 1) + 1;
    const slots = 2 ** (levels - 1);
    const width = Math.max(slots * TREE_SLOT, 4 * TREE_SLOT);
    const top = HEAD + NODE_R + 4;
    return { ...base, w: width, h: top + (levels - 1) * TREE_LEVEL + NODE_R + (pointers ? 34 : 10), pointerY: NODE_R + 16,
      centres: Array.from({ length: n }, (_, i) => {
        const level = treeLevel(i);
        return { x: (i + 1 - 2 ** level + 0.5) * (width / 2 ** level), y: top + level * TREE_LEVEL };
      }) };
  }
  if (s.kind === 'ntree' || s.kind === 'trie') {
    let w = 120, h = 0;
    for (const f of frames) {
      const st = f.state[s.id];
      const l = layoutNTree(st.ntree!, st.values);
      w = Math.max(w, l.w); h = Math.max(h, l.h);
    }
    return { ...base, w: w + 12, h: HEAD + 6 + h + 10 };
  }
  // graph: nodes on a circle, or where the author placed them
  const count = Math.max(1, s.values.length);
  if (s.positions && s.positions.every((p) => p)) {
    const ps = s.positions as Point[];
    const minX = Math.min(...ps.map((p) => p.x)), minY = Math.min(...ps.map((p) => p.y));
    const maxX = Math.max(...ps.map((p) => p.x)), maxY = Math.max(...ps.map((p) => p.y));
    return { ...base, w: (maxX - minX) * UNIT + NODE_R * 2 + 24, h: HEAD + (maxY - minY) * UNIT + NODE_R * 2 + 16,
      centres: ps.map((p) => ({ x: (p.x - minX) * UNIT + NODE_R + 12, y: HEAD + (p.y - minY) * UNIT + NODE_R + 8 })) };
  }
  const radius = Math.max(56, count * 20);
  const size = radius * 2 + NODE_R * 2 + 12;
  const cx = size / 2, cy = HEAD + size / 2;
  return { ...base, w: size, h: HEAD + size,
    centres: s.values.map((_, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
      return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    }) };
}

export function layout(d: Diagram): Layout {
  let y = PAD;
  let width = 0;
  const items = d.structures.map((s) => {
    const item = layoutStructure(s, d.frames);
    item.y = y;
    y += item.h + GAP;
    width = Math.max(width, item.w);
    return item;
  });
  const w = width + PAD * 2;
  items.forEach((it) => { it.x = PAD + (width - it.w) / 2; });
  return { w, h: y - GAP + PAD, items };
}
