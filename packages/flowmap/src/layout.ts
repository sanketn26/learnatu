import type { Cubic, Diagram, FlowNode, Point, Rect } from './types.ts';
import { groupChain, subLabel } from './model.ts';

/**
 * Works out where everything goes. Blocks are put in columns (rows when direction is "down") by how far they are
 * from the start of the flow, ordered to keep links short and group members together. Pure: same text, same picture.
 */
export interface LayoutNode extends Rect { id: string }
export interface LayoutEdge { id: string; curve: Cubic; mid: Point }
export interface LayoutGroup extends Rect { id: string; label: string; kind: string; depth: number }
export interface Layout {
  nodes: Map<string, LayoutNode>;
  edges: Map<string, LayoutEdge>;
  groups: LayoutGroup[];
  /** x, y, width, height of the whole picture, with room for badges and shadows */
  view: Rect;
}

export const NODE_HEIGHT = 62;
const MAIN_GAP = 120;        // between columns
const CROSS_GAP = 52;        // between blocks in a column
const GROUP_EXTRA = 44;      // extra space where one group ends and another begins
const GROUP_PAD = 26;
const MARGIN = 34;

/** Width of a block from its text: icon + the longer of name and sub-label. */
export function nodeWidth(d: Diagram, n: FlowNode): number {
  if (n.width !== undefined) return n.width;
  return Math.max(150, 62 + Math.max(n.label.length * 8.6, subLabel(d, n).length * 6.4) + 14);
}

/** Longest-path ranks, ignoring links that would close a loop. */
export function rankNodes(d: Diagram): Map<string, number> {
  const out = new Map<string, string[]>(d.nodes.map((n) => [n.id, []]));
  const indegree = new Map<string, number>(d.nodes.map((n) => [n.id, 0]));
  for (const e of d.edges) { out.get(e.from)?.push(e.to); }

  // Drop back edges found by a depth-first walk, so loops (a <-> b, retries) do not break the ordering.
  const state = new Map<string, 0 | 1 | 2>();
  const forward = new Map<string, string[]>(d.nodes.map((n) => [n.id, []]));
  const visit = (id: string) => {
    state.set(id, 1);
    for (const next of out.get(id) ?? []) {
      if (state.get(next) === 1) continue; // back edge
      forward.get(id)!.push(next);
      if (!state.has(next)) visit(next);
    }
    state.set(id, 2);
  };
  for (const e of d.edges) indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  const starts = d.nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0);
  for (const n of [...starts, ...d.nodes]) if (!state.has(n.id)) visit(n.id);

  const rank = new Map<string, number>(d.nodes.map((n) => [n.id, 0]));
  // forward edges form a DAG; relax until stable (the graph is small)
  for (let pass = 0; pass < d.nodes.length; pass++) {
    let changed = false;
    for (const [from, tos] of forward) for (const to of tos) {
      if ((rank.get(to) ?? 0) < (rank.get(from) ?? 0) + 1) { rank.set(to, (rank.get(from) ?? 0) + 1); changed = true; }
    }
    if (!changed) break;
  }
  return rank;
}

const groupKey = (d: Diagram, n: FlowNode) => groupChain(d, n.group).reverse().join('/');

export function layout(d: Diagram): Layout {
  const down = d.direction === 'down';
  const rank = rankNodes(d);
  for (const n of d.nodes) if (n.rank !== undefined) rank.set(n.id, n.rank); // placed by the author
  const widths = new Map(d.nodes.map((n) => [n.id, nodeWidth(d, n)]));
  // "main" runs along the flow, "cross" across it
  const mainSize = (n: FlowNode) => (down ? NODE_HEIGHT : widths.get(n.id)!);
  const crossSize = (n: FlowNode) => (down ? widths.get(n.id)! : NODE_HEIGHT);

  const maxRank = Math.max(0, ...rank.values());
  const columns: FlowNode[][] = Array.from({ length: maxRank + 1 }, () => []);
  d.nodes.forEach((n) => columns[rank.get(n.id)!].push(n));
  const declared = new Map(d.nodes.map((n, i) => [n.id, i]));
  columns.forEach((col) => col.sort((a, b) => groupKey(d, a).localeCompare(groupKey(d, b)) || declared.get(a.id)! - declared.get(b.id)!));

  // Order inside columns: keep groups together, then pull each block toward the average of its neighbours.
  const neighbours = (id: string) => d.edges.flatMap((e) => (e.from === id ? [e.to] : e.to === id ? [e.from] : []));
  for (let sweep = 0; sweep < 4; sweep++) {
    const position = new Map<string, number>();
    columns.forEach((col) => col.forEach((n, i) => position.set(n.id, i)));
    const order = sweep % 2 === 0 ? columns.map((_, i) => i) : columns.map((_, i) => columns.length - 1 - i);
    for (const r of order) {
      const score = (n: FlowNode) => {
        const near = neighbours(n.id).filter((id) => rank.get(id) !== r);
        return near.length ? near.reduce((sum, id) => sum + (position.get(id) ?? 0), 0) / near.length : position.get(n.id)!;
      };
      columns[r].sort((a, b) => groupKey(d, a).localeCompare(groupKey(d, b)) || score(a) - score(b) || declared.get(a.id)! - declared.get(b.id)!);
      columns[r].forEach((n, i) => position.set(n.id, i));
    }
  }

  // Blocks the author gave an `order` go to that place in their column; the others keep the order worked out above.
  for (const col of columns) {
    const pinned = col.filter((n) => n.order !== undefined).sort((a, b) => a.order! - b.order!);
    if (!pinned.length) continue;
    const free = col.filter((n) => n.order === undefined);
    const result: FlowNode[] = [];
    for (let i = 0; result.length < col.length; i++) {
      const pin = pinned.find((n) => n.order === i);
      if (pin) result.push(pin);
      else if (free.length) result.push(free.shift()!);
      else result.push(...pinned.filter((n) => !result.includes(n)));
    }
    col.splice(0, col.length, ...result);
  }

  // Positions (centres). main = along the flow.
  const centre = new Map<string, { main: number; cross: number }>();
  let main = 0;
  columns.forEach((col, r) => {
    const thick = Math.max(0, ...col.map(mainSize));
    if (r > 0) {
      const previousThick = Math.max(0, ...columns[r - 1].map(mainSize));
      const groupsChange = new Set(col.map((n) => n.group ?? '')).size !== new Set(columns[r - 1].map((n) => n.group ?? '')).size || col.some((n) => !columns[r - 1].some((p) => p.group === n.group));
      main += previousThick / 2 + MAIN_GAP + (groupsChange ? GROUP_EXTRA : 0) + thick / 2;
    } else main = thick / 2;
    let cross = 0;
    const slots = col.map((n, i) => {
      if (i > 0) cross += CROSS_GAP + (groupKey(d, n) !== groupKey(d, col[i - 1]) ? GROUP_EXTRA : 0);
      const start = cross;
      cross += crossSize(n);
      return start + crossSize(n) / 2;
    });
    const middle = cross / 2;
    col.forEach((n, i) => centre.set(n.id, { main, cross: slots[i] - middle }));
  });

  const nodes = new Map<string, LayoutNode>();
  for (const n of d.nodes) {
    const c = centre.get(n.id)!;
    const w = widths.get(n.id)!;
    nodes.set(n.id, down ? { id: n.id, x: c.cross, y: c.main, w, h: NODE_HEIGHT } : { id: n.id, x: c.main, y: c.cross, w, h: NODE_HEIGHT });
  }

  // ---- links: leave one side, arrive at the facing side; several links on a side are spread out
  type End = { edge: string; node: string; side: 'l' | 'r' | 't' | 'b'; other: string; end: 'from' | 'to' };
  const sideOf = (a: LayoutNode, b: LayoutNode): 'l' | 'r' | 't' | 'b' => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const along = down ? Math.abs(dy) : Math.abs(dx);
    const across = down ? Math.abs(dx) : Math.abs(dy);
    if (along * 0.6 >= across * 0.25) return down ? (dy >= 0 ? 'b' : 't') : (dx >= 0 ? 'r' : 'l'); // blocks in different columns
    return down ? (dx >= 0 ? 'r' : 'l') : (dy >= 0 ? 'b' : 't');                                    // blocks in the same column
  };
  const opposite = { l: 'r', r: 'l', t: 'b', b: 't' } as const;
  const ends: End[] = [];
  const edgeSides = new Map<string, { from: End['side']; to: End['side'] }>();
  d.edges.forEach((e) => {
    const a = nodes.get(e.from)!, b = nodes.get(e.to)!;
    const s = sideOf(a, b);
    edgeSides.set(e.id, { from: s, to: opposite[s] });
    ends.push({ edge: e.id, node: e.from, side: s, other: e.to, end: 'from' });
    ends.push({ edge: e.id, node: e.to, side: opposite[s], other: e.from, end: 'to' });
  });
  const anchor = new Map<string, Point>(); // key: edge id + end
  const edgeIndex = new Map(d.edges.map((e, i) => [e.id, i]));
  const buckets = new Map<string, End[]>();
  ends.forEach((en) => { const k = `${en.node}|${en.side}`; (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(en); });
  for (const list of buckets.values()) {
    const first = list[0];
    const n = nodes.get(first.node)!;
    const vertical = first.side === 'l' || first.side === 'r'; // the side runs top to bottom
    const sideLength = vertical ? n.h : n.w;
    list.sort((p, q) => {
      const po = nodes.get(p.other)!, qo = nodes.get(q.other)!;
      return (vertical ? po.y - qo.y : po.x - qo.x) || edgeIndex.get(p.edge)! - edgeIndex.get(q.edge)!;
    });
    list.forEach((en, i) => {
      const offset = list.length === 1 ? 0 : ((i + 1) / (list.length + 1) - 0.5) * sideLength * 0.7;
      const point: Point = first.side === 'r' ? { x: n.x + n.w / 2, y: n.y + offset }
        : first.side === 'l' ? { x: n.x - n.w / 2, y: n.y + offset }
        : first.side === 'b' ? { x: n.x + offset, y: n.y + n.h / 2 }
        : { x: n.x + offset, y: n.y - n.h / 2 };
      anchor.set(`${en.edge}|${en.end}`, point);
    });
  }
  const edges = new Map<string, LayoutEdge>();
  for (const e of d.edges) {
    const p1 = anchor.get(`${e.id}|from`)!, p2 = anchor.get(`${e.id}|to`)!;
    const side = edgeSides.get(e.id)!.from;
    const horizontal = side === 'l' || side === 'r';
    const sign = side === 'r' || side === 'b' ? 1 : -1;
    const k = (horizontal ? Math.abs(p2.x - p1.x) : Math.abs(p2.y - p1.y)) * 0.5;
    const c1: Point = horizontal ? { x: p1.x + sign * k, y: p1.y } : { x: p1.x, y: p1.y + sign * k };
    const c2: Point = horizontal ? { x: p2.x - sign * k, y: p2.y } : { x: p2.x, y: p2.y - sign * k };
    const curve: Cubic = { p1, c1, c2, p2 };
    edges.set(e.id, { id: e.id, curve, mid: cubicPoint(curve, 0.5) });
  }

  // ---- group boxes: around their members, parents around children
  const rectOf = (id: string): Rect | undefined => nodes.get(id);
  const boxes = new Map<string, Rect>();
  const depth = (id: string) => groupChain(d, id).length - 1;
  const memberRects = (groupId: string): Rect[] => {
    const own = d.nodes.filter((n) => n.group === groupId).map((n) => rectOf(n.id)!);
    const kids = d.groups.filter((g) => g.parent === groupId && g.kind !== 'zone').flatMap((g) => { const b = boxFor(g.id); return b ? [b] : []; });
    return [...own, ...kids];
  };
  const boxFor = (groupId: string): Rect | undefined => {
    const cached = boxes.get(groupId);
    if (cached) return cached;
    const rects = memberRects(groupId);
    if (!rects.length) return undefined;
    const pad = GROUP_PAD;
    const left = Math.min(...rects.map((r) => r.x - r.w / 2)) - pad, right = Math.max(...rects.map((r) => r.x + r.w / 2)) + pad;
    const top = Math.min(...rects.map((r) => r.y - r.h / 2)) - pad - 10, bottom = Math.max(...rects.map((r) => r.y + r.h / 2)) + pad;
    // stored as centre-based rect like nodes
    const box: Rect = { x: (left + right) / 2, y: (top + bottom) / 2, w: right - left, h: bottom - top };
    boxes.set(groupId, box);
    return box;
  };
  const groups: LayoutGroup[] = [];
  for (const g of d.groups) {
    if (g.kind === 'zone') continue;
    const box = boxFor(g.id);
    if (box) groups.push({ id: g.id, label: g.cidr ? `${g.label} · ${g.cidr}` : g.label, kind: g.kind, depth: depth(g.id), ...box });
  }
  groups.sort((a, b) => a.depth - b.depth);

  // ---- overall view box
  const rects: Rect[] = [...nodes.values(), ...groups];
  const left = Math.min(...rects.map((r) => r.x - r.w / 2)), right = Math.max(...rects.map((r) => r.x + r.w / 2));
  const top = Math.min(...rects.map((r) => r.y - r.h / 2)), bottom = Math.max(...rects.map((r) => r.y + r.h / 2));
  const view: Rect = { x: left - MARGIN, y: top - MARGIN - 8, w: right - left + MARGIN * 2, h: bottom - top + MARGIN * 2 + 8 };
  return { nodes, edges, groups, view };
}

export function cubicPoint(c: Cubic, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * c.p1.x + 3 * u * u * t * c.c1.x + 3 * u * t * t * c.c2.x + t * t * t * c.p2.x,
    y: u * u * u * c.p1.y + 3 * u * u * t * c.c1.y + 3 * u * t * t * c.c2.y + t * t * t * c.p2.y
  };
}
