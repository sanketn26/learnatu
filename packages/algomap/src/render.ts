import { esc } from '@learnatu/textmap-core';
import type { Diagram, Point, Structure, StructState } from './types.ts';
import { layout, CELL_W, CELL_H, LIST_W, STACK_W, STACK_H, GRID_W, GRID_H, HEAD, HASH_ITEM_W } from './layout.ts';
import type { StructLayout } from './layout.ts';
import { hashKey, isAlive, layoutNTree, NT_H, pathKey } from './model.ts';

/**
 * Draws one frame of a Diagram as an SVG string. No DOM needed, so it runs anywhere (build, server, browser, tests).
 *
 * Colours come from CSS variables with fallbacks. Set --am-ink, --am-muted, --am-card, --am-line, --am-warn, --am-brand,
 * --am-focus and --am-1 ... --am-3 to match your page; the --fm-* variables of flowmap and the site's own --ink, --muted,
 * --surface and --line are used when those are not set.
 */
export interface RenderOptions {
  /** Makes ids unique when several diagrams share a page. Default "am". */
  idPrefix?: string;
}

const n1 = (v: number) => (Math.round(v * 10) / 10).toString();

const PAINT_FILL: Record<string, string> = { red: '#d6335a', black: '#1d2a27', blue: '#3b5bdb', green: '#2f9e44', orange: '#e8890c', purple: '#7b4fd6', gray: '#8a9a95' };

const STYLE = `
.am{--_ink:var(--am-ink,var(--fm-ink,var(--ink,#17332e)));--_muted:var(--am-muted,var(--fm-muted,var(--muted,#60706c)));--_card:var(--am-card,var(--fm-card,var(--surface,#fff)));--_line:var(--am-line,var(--fm-line,var(--line,#dfe8e3)));
--_warn:var(--am-warn,var(--fm-warn,var(--warn,#b36b00)));--_brand:var(--am-brand,var(--fm-brand,var(--brand,#0b8f7a)));
--_changed:var(--am-1,var(--fm-flow-5,#7b4fd6));--_done:var(--am-2,var(--fm-flow-4,#0b8f7a));--_visit:var(--am-3,var(--fm-flow-6,#1790c4));--_focus:var(--am-focus,var(--fm-flow-1,#4152e0));
font-family:var(--am-font,var(--fm-font,inherit))}
.am .am-head{font:700 12px sans-serif;letter-spacing:.03em;fill:var(--_muted)}
.am .am-box{fill:var(--_card);stroke:color-mix(in srgb,var(--_ink) 30%,var(--_line));stroke-width:1.6}
.am .am-val{font:700 17px ui-monospace,SFMono-Regular,Menlo,monospace;fill:var(--_ink);text-anchor:middle;dominant-baseline:central}
.am .am-val.am-small{font-size:13px}
.am .am-idx{font:600 11.5px sans-serif;fill:var(--_muted);text-anchor:middle}
.am .am-idx.am-end{text-anchor:end}
.am .am-empty{fill:none;stroke:var(--_line);stroke-width:1.5;stroke-dasharray:4 4}
.am .am-link{stroke:color-mix(in srgb,var(--_muted) 80%,transparent);stroke-width:2;fill:none;stroke-linecap:round}
.am .am-link.am-lit{stroke:var(--_brand);stroke-width:4}
.am .am-arrow{fill:color-mix(in srgb,var(--_muted) 80%,transparent)}.am .am-arrow.am-lit{fill:var(--_brand)}
.am .am-ptr{font:800 12.5px sans-serif;fill:var(--_brand);text-anchor:middle}
.am .am-tri{fill:var(--_brand)}
.am .am-null{font:600 12px sans-serif;fill:var(--_muted);text-anchor:start;dominant-baseline:central}
.am .am-tag{font:800 11.5px sans-serif;fill:var(--_ink);text-anchor:middle;paint-order:stroke;stroke:var(--_card);stroke-width:4px;stroke-linejoin:round}
.am .am-tag.am-in{font-size:10.5px;text-anchor:end;fill:var(--_muted)}
.am .am-weight{font:700 12px sans-serif;fill:var(--_ink);text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:var(--_card);stroke-width:5px;stroke-linejoin:round}
.am .am-ring{fill:none;stroke:color-mix(in srgb,var(--_ink) 55%,var(--_line));stroke-width:1.6}
.am .am-top{font:700 11.5px sans-serif;fill:var(--_muted);text-anchor:start;dominant-baseline:central}
.am .am-base{stroke:color-mix(in srgb,var(--_ink) 45%,var(--_line));stroke-width:2.4;stroke-linecap:round}
.am .am-done .am-box{fill:color-mix(in srgb,var(--_done) 22%,var(--_card));stroke:var(--_done)}
.am .am-visit .am-box{fill:color-mix(in srgb,var(--_visit) 18%,var(--_card));stroke:var(--_visit);stroke-dasharray:6 3}
.am .am-compare .am-box{fill:color-mix(in srgb,var(--_warn) 26%,var(--_card));stroke:var(--_warn);stroke-width:3.4}
.am .am-focus .am-box{fill:color-mix(in srgb,var(--_focus) 22%,var(--_card));stroke:var(--_focus);stroke-width:3.4}
.am .am-changed .am-box{fill:color-mix(in srgb,var(--_changed) 24%,var(--_card));stroke:var(--_changed);stroke-width:3.4}
@media (prefers-reduced-motion: no-preference){.am .am-box{transition:fill .25s,stroke .25s}}
`;

function cellClass(st: StructState, i: number): string {
  const classes = ['am-cell'];
  const kept = st.kept[i];
  if (kept) classes.push(`am-${kept}`);
  const flash = st.flash[i];
  if (flash) classes.push(`am-${flash}`);
  return classes.join(' ');
}

const stateWords = (st: StructState, i: number) => [st.flash[i], st.kept[i] === 'done' ? 'done' : st.kept[i] === 'visit' ? 'visited' : '', st.paint[i] ?? '', st.tags[i] ? `note ${st.tags[i]}` : ''].filter(Boolean).join(', ');

/** A fill the author asked for with `paint`, and white text on the dark ones. */
function paint(st: StructState, i: number): { box: string; text: string } {
  const colour = st.paint[i];
  if (!colour) return { box: '', text: '' };
  return { box: ` style="fill:${PAINT_FILL[colour]}"`, text: colour === 'gray' ? '' : ' style="fill:#fff"' };
}

/** One box with a value in it, as a group that carries the highlight classes. */
function cell(st: StructState, i: number, shape: string, value: string | null, cx: number, cy: number, small = false): string {
  const p = paint(st, i);
  const withPaint = shape.replace('class="am-box"', `class="am-box"${p.box}`);
  return `<g class="${cellClass(st, i)}">${withPaint}${value === null || value === '' ? '' : `<text class="am-val${small ? ' am-small' : ''}"${p.text} x="${n1(cx)}" y="${n1(cy)}">${esc(value)}</text>`}</g>`;
}
const rect = (x: number, y: number, w: number, h: number, rx: number) => `<rect class="am-box" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${rx}"/>`;
const circle = (cx: number, cy: number, r: number) => `<circle class="am-box" cx="${n1(cx)}" cy="${n1(cy)}" r="${r}"/>`;

const tagAbove = (st: StructState, i: number, cx: number, topY: number) => (st.tags[i] ? `<text class="am-tag" x="${n1(cx)}" y="${n1(topY - 5)}">${esc(st.tags[i])}</text>` : '');
const tagInside = (st: StructState, i: number, right: number, top: number) => (st.tags[i] ? `<text class="am-tag am-in" x="${n1(right - 3)}" y="${n1(top + 11)}">${esc(st.tags[i])}</text>` : '');

/** `i` and `j` standing on the same cell are written "i, j". */
function pointersAt(st: StructState): Map<number, string> {
  const out = new Map<number, string[]>();
  for (const [name, at] of Object.entries(st.pointers)) out.set(at, [...(out.get(at) ?? []), name]);
  return new Map([...out].map(([at, names]) => [at, names.join(', ')]));
}

function drawPointers(st: StructState, l: StructLayout, y: (at: number) => number, out: string[]) {
  for (const [at, names] of pointersAt(st)) {
    const c = l.centres[at];
    if (!c) continue;
    const py = y(at);
    out.push(`<path class="am-tri" d="M${n1(l.x + c.x)} ${n1(py)}l-5.5 8h11z"/><text class="am-ptr" x="${n1(l.x + c.x)}" y="${n1(py + 21)}">${esc(names)}</text>`);
  }
}

/** Arrays, queues and variables: boxes in a row with a label under each. */
function drawRow(s: Structure, st: StructState, l: StructLayout, out: string[]) {
  l.centres.forEach((c, i) => {
    const x = l.x + c.x - l.cw / 2, y = l.y + c.y - CELL_H / 2;
    if (s.kind !== 'vars' && i >= st.values.length) { out.push(`<rect class="am-empty" x="${n1(x + 2)}" y="${n1(y + 2)}" width="${l.cw - 4}" height="${CELL_H - 4}" rx="5"/>`); return; }
    out.push(cell(st, i, rect(x, y, l.cw, CELL_H, 5), st.values[i], l.x + c.x, l.y + c.y, s.kind === 'vars'));
    out.push(tagAbove(st, i, l.x + c.x, y));
    const last = st.values.length - 1;
    const label = s.kind === 'vars' ? String(s.values[i]) : s.kind === 'queue' ? (i === 0 && last === 0 ? 'front, back' : i === 0 ? 'front' : i === last ? 'back' : String(i)) : String(i);
    out.push(`<text class="am-idx" x="${n1(l.x + c.x)}" y="${n1(l.y + l.indexY)}">${esc(label)}</text>`);
  });
  if (s.kind === 'array' || s.kind === 'queue') drawPointers(st, l, () => l.y + l.pointerY - 12, out);
}

function drawList(st: StructState, l: StructLayout, out: string[]) {
  const half = LIST_W / 2;
  st.values.forEach((v, i) => {
    const c = l.centres[i];
    const x = l.x + c.x - half, y = l.y + c.y - CELL_H / 2;
    const last = i === st.values.length - 1;
    const next = last ? l.tail! : l.centres[i + 1];
    const ax = l.x + c.x + half, bx = l.x + next.x - (last ? 0 : half) - 2;
    out.push(`<path class="am-link" d="M${n1(ax)} ${n1(l.y + c.y)}H${n1(bx - 6)}"/><path class="am-arrow" d="M${n1(bx)} ${n1(l.y + c.y)}l-8 -5v10z"/>`);
    out.push(cell(st, i, rect(x, y, LIST_W, CELL_H, 23), v, l.x + c.x, l.y + c.y));
    out.push(tagAbove(st, i, l.x + c.x, y));
    out.push(`<text class="am-idx" x="${n1(l.x + c.x)}" y="${n1(l.y + l.indexY)}">${i === 0 ? 'head' : i}</text>`);
  });
  out.push(`<text class="am-null" x="${n1(l.x + l.tail!.x + 2)}" y="${n1(l.y + l.tail!.y)}">null</text>`);
  drawPointers(st, l, () => l.y + l.pointerY - 12, out);
}

function drawStack(st: StructState, l: StructLayout, out: string[]) {
  const baseY = l.y + l.h - 6;
  out.push(`<path class="am-base" d="M${n1(l.x + l.gutter - 6)} ${n1(baseY)}H${n1(l.x + l.gutter + STACK_W + 6)}"/>`);
  l.centres.forEach((c, i) => {
    const x = l.x + c.x - STACK_W / 2, y = l.y + c.y - STACK_H / 2;
    if (i >= st.values.length) return;
    out.push(cell(st, i, rect(x + 1, y + 1, STACK_W - 2, STACK_H - 2, 4), st.values[i], l.x + c.x, l.y + c.y));
    out.push(tagInside(st, i, x + STACK_W, y));
    out.push(`<text class="am-idx am-end" x="${n1(l.x + l.gutter - 10)}" y="${n1(l.y + c.y + 4)}">${i}</text>`);
    if (i === st.values.length - 1) out.push(`<text class="am-top" x="${n1(x + STACK_W + 8)}" y="${n1(l.y + c.y)}">◂ top</text>`);
  });
  if (!st.values.length) out.push(`<text class="am-top" x="${n1(l.x + l.gutter + 6)}" y="${n1(baseY - 14)}">empty</text>`);
}

function drawGrid(s: Structure, st: StructState, l: StructLayout, out: string[]) {
  const rows = s.rows!, cols = s.cols!;
  for (let c = 0; c < cols; c++) out.push(`<text class="am-idx" x="${n1(l.x + l.gutter + c * GRID_W + GRID_W / 2)}" y="${n1(l.y + HEAD + 15)}">${esc(s.colNames?.[c] ?? String(c))}</text>`);
  for (let r = 0; r < rows; r++) out.push(`<text class="am-idx am-end" x="${n1(l.x + l.gutter - 8)}" y="${n1(l.y + HEAD + l.topGutter + r * GRID_H + GRID_H / 2 + 4)}">${esc(s.rowNames?.[r] ?? String(r))}</text>`);
  l.centres.forEach((c, i) => {
    const x = l.x + c.x - GRID_W / 2, y = l.y + c.y - GRID_H / 2;
    out.push(cell(st, i, rect(x, y, GRID_W, GRID_H, 3), st.values[i], l.x + c.x, l.y + c.y));
    out.push(tagInside(st, i, x + GRID_W, y));
  });
}

function drawHash(st: StructState, l: StructLayout, out: string[]) {
  const chains = st.chains!;
  chains.forEach((chain, b) => {
    const bc = l.keyed!.get(hashKey(b))!;
    const x = l.x + bc.x - CELL_W / 2, y = l.y + bc.y - 18;
    out.push(cell(st, hashKey(b), rect(x, y, CELL_W, 36, 4), String(b), l.x + bc.x, l.y + bc.y));
    out.push(tagInside(st, hashKey(b), x + CELL_W, y));
    let from = x + CELL_W;
    chain.forEach((v, k) => {
      const c = l.keyed!.get(hashKey(b, k))!;
      const left = l.x + c.x - HASH_ITEM_W / 2;
      out.push(`<path class="am-link" d="M${n1(from)} ${n1(l.y + c.y)}H${n1(left - 6)}"/><path class="am-arrow" d="M${n1(left - 1)} ${n1(l.y + c.y)}l-8 -5v10z"/>`);
      out.push(cell(st, hashKey(b, k), rect(left, l.y + c.y - 18, HASH_ITEM_W, 36, 18), v, l.x + c.x, l.y + c.y, v.length > 5));
      out.push(tagInside(st, hashKey(b, k), left + HASH_ITEM_W, l.y + c.y - 18));
      from = left + HASH_ITEM_W;
    });
  });
}

function drawTree(st: StructState, l: StructLayout, out: string[]) {
  st.values.forEach((v, i) => {
    if (v === null || i === 0) return;
    const p = (i - 1) >> 1;
    if (st.values[p] === null) return;
    const a = l.centres[p], b = l.centres[i];
    out.push(`<path class="am-link" d="M${n1(l.x + a.x)} ${n1(l.y + a.y)}L${n1(l.x + b.x)} ${n1(l.y + b.y)}"/>`);
  });
  st.values.forEach((v, i) => {
    if (v === null) return;
    const c = l.centres[i];
    out.push(cell(st, i, circle(l.x + c.x, l.y + c.y, l.r), v, l.x + c.x, l.y + c.y));
    out.push(tagAbove(st, i, l.x + c.x, l.y + c.y - l.r));
  });
  drawPointers(st, l, (at) => l.y + (l.centres[at]?.y ?? 0) + l.r + 2, out);
}

/** Trees of named nodes, tries and forests. Each frame is laid out again, inside the room the largest frame needs. */
function drawNTree(s: Structure, st: StructState, l: StructLayout, out: string[]) {
  const nt = st.ntree!;
  const lay = layoutNTree(nt, st.values);
  const ox = l.x + (l.w - lay.w) / 2, oy = l.y + HEAD + 6;
  nt.children.forEach((kids, p) => {
    if (!isAlive(st.values, p)) return;
    for (const c of kids) {
      if (c < 0 || !lay.centres[c]) continue;
      out.push(`<path class="am-link" d="M${n1(ox + lay.centres[p]!.x)} ${n1(oy + lay.centres[p]!.y + NT_H / 2)}L${n1(ox + lay.centres[c]!.x)} ${n1(oy + lay.centres[c]!.y - NT_H / 2)}"/>`);
    }
  });
  st.values.forEach((label, i) => {
    const c = lay.centres[i];
    if (!c || label === null) return;
    const w = lay.widths[i];
    const x = ox + c.x, y = oy + c.y;
    if (nt.terminal.includes(i)) out.push(`<rect class="am-ring" x="${n1(x - w / 2 - 4)}" y="${n1(y - NT_H / 2 - 4)}" width="${n1(w + 8)}" height="${NT_H + 8}" rx="${NT_H / 2 + 4}"/>`);
    const shown = s.kind === 'trie' && i === 0 ? '•' : label;
    out.push(cell(st, i, rect(x - w / 2, y - NT_H / 2, w, NT_H, NT_H / 2), shown, x, y, shown.length > 6));
    out.push(tagAbove(st, i, x, y - NT_H / 2));
  });
}

function drawGraph(s: Structure, st: StructState, l: StructLayout, out: string[]) {
  const lit = new Set(st.paths);
  for (const e of s.edges) {
    const a = l.centres[e.from], b = l.centres[e.to];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const on = lit.has(pathKey(e.from, e.to)) || (!e.directed && lit.has(pathKey(e.to, e.from)));
    const x1 = l.x + a.x + ux * l.r, y1 = l.y + a.y + uy * l.r;
    const x2 = l.x + b.x - ux * (l.r + (e.directed ? 7 : 0)), y2 = l.y + b.y - uy * (l.r + (e.directed ? 7 : 0));
    out.push(`<path class="am-link${on ? ' am-lit' : ''}" d="M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}"/>`);
    if (e.directed) {
      const tx = x2 + ux * 7, ty = y2 + uy * 7;
      out.push(`<path class="am-arrow${on ? ' am-lit' : ''}" d="M${n1(tx)} ${n1(ty)}l${n1(-ux * 11 - uy * 5.5)} ${n1(-uy * 11 + ux * 5.5)}l${n1(uy * 11)} ${n1(-ux * 11)}z"/>`);
    }
    const weight = st.weights?.[pathKey(e.from, e.to)] ?? e.weight;
    if (weight !== undefined) out.push(`<text class="am-weight" x="${n1(l.x + (a.x + b.x) / 2)}" y="${n1(l.y + (a.y + b.y) / 2)}">${esc(weight)}</text>`);
  }
  s.values.forEach((name, i) => {
    const c = l.centres[i];
    out.push(cell(st, i, circle(l.x + c.x, l.y + c.y, l.r), name, l.x + c.x, l.y + c.y));
    out.push(tagAbove(st, i, l.x + c.x, l.y + c.y - l.r));
  });
}

/** What the picture shows, in plain words, for screen readers and for the text next to it. */
export function describe(d: Diagram, frameIndex: number): string {
  const f = d.frames[frameIndex];
  if (!f) return '';
  const word = (st: StructState, i: number) => (stateWords(st, i) ? ` (${stateWords(st, i)})` : '');
  const parts = d.structures.map((s) => {
    const st = f.state[s.id];
    const name = s.label ?? s.id;
    const ptrs = Object.entries(st.pointers).map(([k, at]) => `${k} at ${at}`).join(', ');
    switch (s.kind) {
      case 'graph': {
        const links = s.edges.map((e) => {
          const w = st.weights?.[pathKey(e.from, e.to)] ?? e.weight;
          return `${s.values[e.from]} ${e.directed ? 'to' : 'linked with'} ${s.values[e.to]}${w !== undefined ? ` (weight ${w})` : ''}`;
        }).join('; ');
        const marked = s.values.map((v, i) => (stateWords(st, i) ? `${v}${word(st, i)}` : '')).filter(Boolean).join(', ');
        return `Graph ${name}: ${links}${marked ? `. Marked: ${marked}` : ''}`;
      }
      case 'vars':
        return `Variables ${name}: ${s.values.map((v, i) => `${v} = ${st.values[i] ?? 'unset'}${word(st, i)}`).join(', ')}`;
      case 'grid': {
        const rows = Array.from({ length: s.rows! }, (_, r) => `row ${s.rowNames?.[r] ?? r}: ${Array.from({ length: s.cols! }, (_, c) => `${st.values[r * s.cols! + c] ?? 'empty'}${word(st, r * s.cols! + c)}`).join(', ')}`);
        return `Grid ${name}, ${rows.join('; ')}`;
      }
      case 'hash':
        return `Hash table ${name}: ${st.chains!.map((c, b) => `bucket ${b}${word(st, hashKey(b))}: ${c.length ? c.map((v, k) => `${v}${word(st, hashKey(b, k))}`).join(', ') : 'empty'}`).join('; ')}`;
      case 'ntree': case 'trie': {
        const nt = st.ntree!;
        const text = (i: number): string => {
          const kids = nt.children[i].filter((c) => c >= 0);
          const label = s.kind === 'trie' && i === 0 ? 'start' : st.values[i];
          return `${label}${nt.terminal.includes(i) ? ' (word ends)' : ''}${word(st, i)}${kids.length ? ` [${kids.map(text).join(', ')}]` : ''}`;
        };
        return `${s.kind === 'trie' ? 'Trie' : 'Tree'} ${name}: ${nt.roots.filter((r) => r >= 0).map(text).join(' and ')}`;
      }
      default: {
        const cells = st.values.map((v, i) => `${i}: ${v ?? 'empty'}${word(st, i)}`).join(', ');
        const order = s.kind === 'stack' ? ' (bottom first)' : s.kind === 'queue' ? ' (front first)' : s.kind === 'tree' ? ' (level by level)' : '';
        return `${s.kind[0].toUpperCase()}${s.kind.slice(1)} ${name}${order}: ${cells || 'empty'}${ptrs ? `. Pointers: ${ptrs}` : ''}`;
      }
    }
  });
  return `Step ${frameIndex} of ${d.frames.length - 1}. ${f.caption}. ${parts.join('. ')}.`;
}

export function renderSvg(d: Diagram, frameIndex = 0, options: RenderOptions = {}): string {
  const id = options.idPrefix ?? 'am';
  const f = d.frames[Math.min(Math.max(frameIndex, 0), d.frames.length - 1)];
  const lay = layout(d);
  const out: string[] = [];
  out.push(`<svg class="am" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n1(lay.w)} ${n1(lay.h)}" role="img" aria-labelledby="${id}-t ${id}-d" style="width:100%;max-width:${Math.round(lay.w)}px;height:auto;display:block;margin:0 auto">`);
  out.push(`<title id="${id}-t">${esc(d.title ?? 'Algorithm steps')}</title><desc id="${id}-d">${esc(describe(d, d.frames.indexOf(f)))}</desc>`);
  out.push(`<style>${STYLE}</style>`);
  for (const l of lay.items) {
    const s = d.structures.find((x) => x.id === l.id)!;
    const st = f.state[s.id];
    out.push(`<g data-id="${esc(s.id)}"><text class="am-head" x="${n1(l.x)}" y="${n1(l.y + l.headY)}">${esc(s.label ?? s.id)}</text>`);
    switch (s.kind) {
      case 'array': case 'queue': case 'vars': drawRow(s, st, l, out); break;
      case 'list': drawList(st, l, out); break;
      case 'stack': drawStack(st, l, out); break;
      case 'grid': drawGrid(s, st, l, out); break;
      case 'hash': drawHash(st, l, out); break;
      case 'tree': drawTree(st, l, out); break;
      case 'ntree': case 'trie': drawNTree(s, st, l, out); break;
      case 'graph': drawGraph(s, st, l, out); break;
    }
    out.push('</g>');
  }
  out.push('</svg>');
  return out.join('');
}

export type { Point };
export { CELL_W, CELL_H, STACK_W, STACK_H, GRID_W, GRID_H, HASH_ITEM_W };
