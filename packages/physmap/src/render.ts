import type { Model, Sample, Series, Simulation } from './types.ts';
import { dimSymbol } from './units.ts';

/**
 * Draws one moment of a simulation as an SVG string: the scene on top, a graph under it for each `plot` line, and a
 * cursor on every graph. No DOM needed, so it runs anywhere (build, server, browser, tests).
 *
 * Colours come from CSS variables with fallbacks. Set --pm-ink, --pm-muted, --pm-card, --pm-line, --pm-brand and
 * --pm-1 ... --pm-4 to match your page; the --am-*, --fm-* variables and the site's own --ink, --muted, --surface and
 * --line are used when those are not set.
 */
export interface RenderOptions {
  /** Makes ids unique when several scenes share a page. Default "pm". */
  idPrefix?: string;
  /** Turns the name of a picture in the text into its address on the page. */
  resolveImage?: (ref: string) => string;
}

export const WIDTH = 720;
const MAX_SCENE_H = 360;
const MIN_SCENE_H = 170;
const PLOT_H = 130;
const MARGIN = 28;
const LEFT = 56;

const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
export const num = (v: number): string => (v === 0 ? '0' : parseFloat(v.toPrecision(3)).toString());

const STYLE = `
.pm{--_ink:var(--pm-ink,var(--am-ink,var(--fm-ink,var(--ink,#17332e))));--_muted:var(--pm-muted,var(--am-muted,var(--fm-muted,var(--muted,#60706c))));--_card:var(--pm-card,var(--am-card,var(--fm-card,var(--surface,#fff))));--_line:var(--pm-line,var(--am-line,var(--fm-line,var(--line,#dfe8e3))));
--_brand:var(--pm-brand,var(--am-brand,var(--fm-brand,var(--brand,#0b8f7a))));--_1:var(--pm-1,var(--fm-flow-1,#4152e0));--_2:var(--pm-2,var(--fm-flow-5,#d6335a));--_3:var(--pm-3,var(--fm-flow-4,#0b8f7a));--_4:var(--pm-4,var(--fm-warn,#e8890c));
font-family:var(--pm-font,var(--am-font,var(--fm-font,inherit)))}
.pm text{font:600 12px sans-serif;fill:var(--_muted)}
.pm .pm-axis{stroke:var(--_line);stroke-width:1.2;fill:none}
.pm .pm-ground{stroke:var(--_ink);stroke-width:2.4}.pm .pm-hatch{stroke:var(--_muted);stroke-width:1.2}
.pm .pm-link{stroke:var(--_ink);stroke-width:2.2;fill:none;stroke-linejoin:round}.pm .pm-rod{stroke-width:3.6;stroke-linecap:round}
.pm .pm-anchor{fill:var(--_ink)}
.pm .pm-body{stroke:var(--_ink);stroke-width:1.8}
.pm .pm-name{font:700 12.5px sans-serif;fill:var(--_ink)}
.pm .pm-trail{fill:none;stroke-width:2;stroke-opacity:.45;stroke-dasharray:2 4}
.pm .pm-arrow{stroke-width:3;fill:none;stroke-linecap:round}.pm .pm-head{stroke:none}
.pm .pm-scale{stroke:var(--_ink);stroke-width:1.8}
.pm .pm-clock{font:700 13px ui-monospace,monospace;fill:var(--_ink);text-anchor:end}
.pm .pm-series{fill:none;stroke-width:2.2;stroke-linejoin:round}
.pm .pm-cursor{stroke:var(--_ink);stroke-width:1.4;stroke-dasharray:3 3}
.pm .pm-tick{font:600 11px ui-monospace,monospace;fill:var(--_muted)}
.pm .pm-end{text-anchor:end}.pm .pm-mid{text-anchor:middle}
`;

const COLOURS = ['var(--_1)', 'var(--_2)', 'var(--_3)', 'var(--_4)'];
const colour = (i: number) => COLOURS[i % COLOURS.length];

/** The value of a series at one sample. */
export function seriesValue(s: Sample, ids: string[], series: Series): number {
  if (series.q === 'pe') return s.pe;
  if (series.q === 'energy') return s.energy;
  if (series.q === 'ke' && !series.body) return s.b.reduce((sum, row) => sum + row[6], 0);
  const b = s.b[ids.indexOf(series.body as string)];
  switch (series.q) {
    case 'x': return b[0];
    case 'y': return b[1];
    case 'vx': return b[2];
    case 'vy': return b[3];
    case 'speed': return Math.hypot(b[2], b[3]);
    default: return b[6];
  }
}
const seriesName = (s: Series) => (s.body ? `${s.body}.${s.q}` : s.q);

const QDIM: Record<string, string> = { x: 'm', y: 'm', vx: 'm/s', vy: 'm/s', speed: 'm/s', ke: 'J', pe: 'J', energy: 'J' };

/** 1, 2 or 5 times a power of ten, at most `x`. */
function nice(x: number): number {
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
}

interface PlotCache { svg: string; lo: number; hi: number }
const plotCache = new WeakMap<Simulation, PlotCache[]>();

/** Wide, flat scenes (a spring along one line) need less height than tall ones (a throw). Same for every moment. */
function sceneHeight(sim: Simulation): number {
  const { x0, y0, x1, y1 } = sim.view;
  const fit = ((y1 - y0) * (WIDTH - 2 * MARGIN)) / (x1 - x0) + 2 * MARGIN;
  return Math.round(Math.min(MAX_SCENE_H, Math.max(MIN_SCENE_H, fit)));
}

function drawPlot(model: Model, sim: Simulation, index: number, top: number): PlotCache {
  const plot = model.plots[index];
  const w = WIDTH - LEFT - 14;
  const h = PLOT_H - 46;
  const y0 = top + 26;
  const values = plot.series.map((s) => sim.samples.map((sample) => seriesValue(sample, sim.bodyIds, s)));
  let lo = Math.min(...values.flat());
  let hi = Math.max(...values.flat());
  if (!(hi > lo)) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;
  const px = (t: number) => LEFT + (t / model.run) * w;
  const py = (v: number) => y0 + h - ((v - lo) / (hi - lo)) * h;
  let svg = `<rect x="${LEFT}" y="${y0}" width="${w}" height="${h}" class="pm-axis"/>`;
  if (lo < 0 && hi > 0) svg += `<line x1="${LEFT}" x2="${LEFT + w}" y1="${f1(py(0))}" y2="${f1(py(0))}" class="pm-axis" stroke-dasharray="4 4"/>`;
  plot.series.forEach((s, k) => {
    const d = values[k].map((v, j) => `${j ? 'L' : 'M'}${f1(px(sim.samples[j].t))} ${f1(py(v))}`).join('');
    svg += `<path d="${d}" class="pm-series" stroke="${colour(k)}"/>`;
  });
  const unit = QDIM[plot.series[0].q];
  svg += `<text x="${LEFT - 6}" y="${y0 + 4}" class="pm-tick pm-end">${num(hi)}</text><text x="${LEFT - 6}" y="${y0 + h}" class="pm-tick pm-end">${num(lo)}</text>`;
  svg += `<text x="${LEFT}" y="${y0 + h + 14}" class="pm-tick">0 s</text><text x="${LEFT + w}" y="${y0 + h + 14}" class="pm-tick pm-end">${num(model.run)} s</text>`;
  let lx = LEFT;
  plot.series.forEach((s, k) => {
    const name = `${seriesName(s)} (${unit})`;
    svg += `<rect x="${lx}" y="${top + 8}" width="14" height="4" rx="2" fill="${colour(k)}"/><text x="${lx + 19}" y="${top + 14}">${esc(name)}</text>`;
    lx += 19 + name.length * 7 + 14;
  });
  return { svg, lo, hi };
}

function arrow(x: number, y: number, dx: number, dy: number, cls: string, stroke: string): string {
  const len = Math.hypot(dx, dy);
  if (len < 4) return '';
  const ux = dx / len, uy = dy / len;
  const x2 = x + dx, y2 = y + dy;
  const hx = 8, hw = 4.5;
  return `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x2 - ux * hx)}" y2="${f1(y2 - uy * hx)}" class="pm-arrow" stroke="${stroke}"/>` +
    `<polygon points="${f1(x2)},${f1(y2)} ${f1(x2 - ux * hx - uy * hw)},${f1(y2 - uy * hx + ux * hw)} ${f1(x2 - ux * hx + uy * hw)},${f1(y2 - uy * hx - ux * hw)}" class="pm-head" fill="${stroke}"/>`;
}

export function renderSvg(model: Model, sim: Simulation, index: number, options: RenderOptions = {}): string {
  const at = Math.min(Math.max(Math.round(index), 0), sim.samples.length - 1);
  const sample = sim.samples[at];
  const { x0, y0, x1, y1 } = sim.view;
  const SCENE_H = sceneHeight(sim);
  const scale = Math.min((WIDTH - 2 * MARGIN) / (x1 - x0), (SCENE_H - 2 * MARGIN) / (y1 - y0));
  const ox = (WIDTH - (x1 - x0) * scale) / 2;
  const oy = (SCENE_H - (y1 - y0) * scale) / 2;
  const X = (x: number) => ox + (x - x0) * scale;
  const Y = (y: number) => oy + (y1 - y) * scale;
  const pxRadius = (i: number) => Math.max(model.bodies[i].radius * scale, 9);
  const height = SCENE_H + model.plots.length * PLOT_H;
  let out = '';

  if (model.backdrop && options.resolveImage) {
    const bx = typeof model.backdrop.from[0] === 'number' ? model.backdrop.from[0] : sim.params[model.backdrop.from[0].param];
    const by = typeof model.backdrop.from[1] === 'number' ? model.backdrop.from[1] : sim.params[model.backdrop.from[1].param];
    const w = model.backdrop.size[0] * scale;
    const h = model.backdrop.size[1] * scale;
    out += `<image href="${esc(options.resolveImage(model.backdrop.ref))}" x="${f1(X(bx))}" y="${f1(Y(by + model.backdrop.size[1]))}" width="${f1(w)}" height="${f1(h)}" preserveAspectRatio="none" opacity=".92"/>`;
  }

  if (model.ground) {
    const gy = typeof model.ground.y === 'number' ? model.ground.y : sim.params[model.ground.y.param];
    const lift = Math.max(0, ...model.bodies.map((_, i) => pxRadius(i) - model.bodies[i].radius * scale));
    const py = Y(gy) + lift;
    out += `<line x1="0" x2="${WIDTH}" y1="${f1(py)}" y2="${f1(py)}" class="pm-ground"/>`;
    for (let hx = 6; hx < WIDTH; hx += 14) out += `<line x1="${hx}" x2="${hx - 8}" y1="${f1(py)}" y2="${f1(py + 8)}" class="pm-hatch"/>`;
  }

  const bar = nice((WIDTH * 0.2) / scale);
  out += `<g><line x1="${MARGIN}" x2="${f1(MARGIN + bar * scale)}" y1="${SCENE_H - 14}" y2="${SCENE_H - 14}" class="pm-scale"/><text x="${MARGIN}" y="${SCENE_H - 20}">${num(bar)} m</text></g>`;
  out += `<text x="${WIDTH - 12}" y="22" class="pm-clock">t = ${num(sample.t)} s</text>`;

  model.bodies.forEach((body, i) => {
    if (!model.trails.includes(body.id)) return;
    const d = sim.samples.slice(0, at + 1).map((s, j) => `${j ? 'L' : 'M'}${f1(X(s.b[i][0]))} ${f1(Y(s.b[i][1]))}`).join('');
    out += `<path d="${d}" class="pm-trail" stroke="${colour(i)}"/>`;
  });

  const pos = (e: { body: string } | { point: [unknown, unknown] }, s: Sample): [number, number] => {
    if ('body' in e) { const b = s.b[sim.bodyIds.indexOf(e.body)]; return [X(b[0]), Y(b[1])]; }
    const val = (v: unknown) => (typeof v === 'number' ? v : sim.params[(v as { param: string }).param]);
    return [X(val(e.point[0])), Y(val(e.point[1]))];
  };
  for (const link of model.links) {
    const [ax, ay] = pos(link.from as never, sample);
    const [bx, by] = pos(link.to as never, sample);
    for (const [e, px, py] of [[link.from, ax, ay], [link.to, bx, by]] as const) if (!('body' in e)) out += `<rect x="${f1(px - 5)}" y="${f1(py - 5)}" width="10" height="10" class="pm-anchor" rx="2"/>`;
    if (link.kind === 'rod') { out += `<line x1="${f1(ax)}" y1="${f1(ay)}" x2="${f1(bx)}" y2="${f1(by)}" class="pm-link pm-rod"/>`; continue; }
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 30) { out += `<line x1="${f1(ax)}" y1="${f1(ay)}" x2="${f1(bx)}" y2="${f1(by)}" class="pm-link"/>`; continue; }
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const nx = -uy, ny = ux;
    const lead = Math.min(14, len * 0.15);
    const coils = 9;
    let d = `M${f1(ax)} ${f1(ay)}L${f1(ax + ux * lead)} ${f1(ay + uy * lead)}`;
    for (let c = 0; c < coils; c++) {
      const t = lead + ((len - 2 * lead) * (c + 0.5)) / coils;
      const side = c % 2 ? -1 : 1;
      d += `L${f1(ax + ux * t + nx * 7 * side)} ${f1(ay + uy * t + ny * 7 * side)}`;
    }
    d += `L${f1(bx - ux * lead)} ${f1(by - uy * lead)}L${f1(bx)} ${f1(by)}`;
    out += `<path d="${d}" class="pm-link"/>`;
  }

  model.bodies.forEach((body, i) => {
    const b = sample.b[i];
    const cx = X(b[0]), cy = Y(b[1]);
    const r = pxRadius(i);
    if (body.sprite && options.resolveImage) {
      const s = Math.max(2 * body.radius * scale, 28);
      out += `<image href="${esc(options.resolveImage(body.sprite))}" x="${f1(cx - s / 2)}" y="${f1(cy - s / 2)}" width="${f1(s)}" height="${f1(s)}"/>`;
    } else out += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" class="pm-body" fill="${colour(i)}" fill-opacity=".85"/>`;
    out += `<text x="${f1(cx + r + 5)}" y="${f1(cy + 4)}" class="pm-name">${esc(body.id)}</text>`;
    if (model.showVelocity.includes(body.id)) out += arrow(cx, cy, (b[2] / sim.maxSpeed) * 70, (-b[3] / sim.maxSpeed) * 70, 'v', 'var(--_2)');
    if (model.showForce.includes(body.id)) out += arrow(cx, cy, (b[4] / sim.maxForce) * 70, (-b[5] / sim.maxForce) * 70, 'f', 'var(--_3)');
  });

  if (model.plots.length) {
    let cache = plotCache.get(sim);
    if (!cache) { cache = model.plots.map((_, k) => drawPlot(model, sim, k, SCENE_H + k * PLOT_H)); plotCache.set(sim, cache); }
    const w = WIDTH - LEFT - 14;
    cache.forEach((c, k) => {
      const top = SCENE_H + k * PLOT_H;
      const y0p = top + 26;
      const h = PLOT_H - 46;
      out += c.svg;
      const cx = LEFT + (sample.t / model.run) * w;
      out += `<line x1="${f1(cx)}" x2="${f1(cx)}" y1="${y0p}" y2="${y0p + h}" class="pm-cursor"/>`;
      model.plots[k].series.forEach((s, j) => {
        const v = seriesValue(sample, sim.bodyIds, s);
        out += `<circle cx="${f1(cx)}" cy="${f1(y0p + h - ((v - c.lo) / (c.hi - c.lo)) * h)}" r="4" fill="${colour(j)}" stroke="var(--_card)" stroke-width="1.5"/>`;
      });
    });
  }

  const id = options.idPrefix ?? 'pm';
  return `<svg class="pm" id="${id}" viewBox="0 0 ${WIDTH} ${height}" width="100%" style="max-width:${WIDTH}px;height:auto" role="img" aria-label="${esc(describe(model, sim, at))}"><style>${STYLE}</style>${out}</svg>`;
}

/** One moment in plain words, for screen readers. */
export function describe(model: Model, sim: Simulation, index: number): string {
  const at = Math.min(Math.max(Math.round(index), 0), sim.samples.length - 1);
  const s = sim.samples[at];
  const parts = model.bodies.map((b, i) => `${b.id} at x ${num(s.b[i][0])} m, y ${num(s.b[i][1])} m, moving at ${num(Math.hypot(s.b[i][2], s.b[i][3]))} m/s`);
  return `${model.title ? `${model.title}. ` : ''}At ${num(s.t)} seconds: ${parts.join('; ')}.`;
}

/** The note that applies at time `t` (the last one at or before it), or the title / a hint when there is none yet. */
export function captionAt(model: Model, t: number): string {
  let text = model.title ?? '';
  for (const n of model.notes) if (n.t <= t + 1e-9) text = n.text;
  return text;
}

export const unitOf = dimSymbol;
