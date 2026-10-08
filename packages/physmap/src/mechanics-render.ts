import type { Model, Sample, Series, Simulation } from './types.ts';
import { BASE_STYLE, WIDTH, arrow, colour, esc, f1, makePlot, nice, num, svgWrap } from './draw.ts';
import type { Plot } from './draw.ts';
import type { RenderOptions } from './scene.ts';

/** Draws one moment of a mechanics simulation: the scene on top, a graph under it for each `plot` line, with a cursor. */
const MAX_SCENE_H = 360;
const MIN_SCENE_H = 170;
const PLOT_H = 130;
const MARGIN = 28;

const STYLE = `
.pm .pm-ground{stroke:var(--_ink);stroke-width:2.4}.pm .pm-hatch{stroke:var(--_muted);stroke-width:1.2}
.pm .pm-link{stroke:var(--_ink);stroke-width:2.2;fill:none;stroke-linejoin:round}.pm .pm-rod{stroke-width:3.6;stroke-linecap:round}
.pm .pm-anchor{fill:var(--_ink)}
.pm .pm-wedge{fill:var(--_muted);fill-opacity:.14;stroke:none}
.pm .pm-trail{fill:none;stroke-width:2;stroke-opacity:.45;stroke-dasharray:2 4}
`;

/** The value of a series at one sample. */
export function seriesValue(s: Sample, ids: string[], series: Series): number {
  if (series.q === 'pe') return s.pe;
  if (series.q === 'energy') return s.energy;
  if (series.q === 'ke' && !series.body) return s.b.reduce((sum, row) => sum + row[6], 0);
  if (series.q === 'px' && !series.body) return s.b.reduce((sum, row) => sum + row[11], 0);
  if (series.q === 'py' && !series.body) return s.b.reduce((sum, row) => sum + row[12], 0);
  const b = s.b[ids.indexOf(series.body as string)];
  switch (series.q) {
    case 'x': return b[0];
    case 'y': return b[1];
    case 'vx': return b[2];
    case 'vy': return b[3];
    case 'speed': return Math.hypot(b[2], b[3]);
    case 'px': return b[11];
    case 'py': return b[12];
    case 'normal': return Math.hypot(b[7], b[8]);
    case 'friction': return Math.hypot(b[9], b[10]);
    default: return b[6];
  }
}
const seriesName = (s: Series) => (s.body ? `${s.body}.${s.q}` : s.q);
const QDIM: Record<string, string> = { x: 'm', y: 'm', vx: 'm/s', vy: 'm/s', speed: 'm/s', ke: 'J', pe: 'J', energy: 'J', px: 'kg·m/s', py: 'kg·m/s', normal: 'N', friction: 'N' };

/** Wide, flat scenes (a spring along one line) need less height than tall ones (a throw). Same for every moment. */
function sceneHeight(sim: Simulation): number {
  const { x0, y0, x1, y1 } = sim.view;
  const fit = ((y1 - y0) * (WIDTH - 2 * MARGIN)) / (x1 - x0) + 2 * MARGIN;
  return Math.round(Math.min(MAX_SCENE_H, Math.max(MIN_SCENE_H, fit)));
}

const plotCache = new WeakMap<Simulation, { plot: Plot; ids: Series[] }[]>();

function plots(model: Model, sim: Simulation, sceneH: number) {
  let cache = plotCache.get(sim);
  if (!cache) {
    cache = model.plots.map((p, k) => ({
      ids: p.series,
      plot: makePlot({
        top: sceneH + k * PLOT_H, height: PLOT_H, unit: QDIM[p.series[0].q],
        xFrom: 0, xTo: model.run, xFromLabel: '0 s', xToLabel: `${num(model.run)} s`,
        series: p.series.map((s) => ({ name: seriesName(s), xs: sim.samples.map((x) => x.t), ys: sim.samples.map((x) => seriesValue(x, sim.bodyIds, s)) }))
      })
    }));
    plotCache.set(sim, cache);
  }
  return cache;
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
  const param = (v: unknown) => (typeof v === 'number' ? v : sim.params[(v as { param: string }).param]);
  let out = '';

  if (model.backdrop && options.resolveImage) {
    const bx = param(model.backdrop.from[0]);
    const by = param(model.backdrop.from[1]);
    out += `<image href="${esc(options.resolveImage(model.backdrop.ref))}" x="${f1(X(bx))}" y="${f1(Y(by + model.backdrop.size[1]))}" width="${f1(model.backdrop.size[0] * scale)}" height="${f1(model.backdrop.size[1] * scale)}" preserveAspectRatio="none" opacity=".92"/>`;
  }

  // floors and ramps; drawn a little lower when the bodies have no size, so they sit on the line and not in it
  const lift = Math.max(0, ...model.bodies.map((_, i) => pxRadius(i) - model.bodies[i].radius * scale));
  for (const surface of model.surfaces) {
    const angle = param(surface.angle);
    const tx = Math.cos(angle), ty = Math.sin(angle);
    const dx = ty * lift, dy = tx * lift;                       // one lift step opposite to the surface normal, on screen
    const x0s = X(param(surface.from[0])) + dx, y0s = Y(param(surface.from[1])) + dy;
    if (surface.kind === 'ground') {
      out += `<line x1="0" x2="${WIDTH}" y1="${f1(y0s)}" y2="${f1(y0s)}" class="pm-ground"/>`;
      for (let hx = 6; hx < WIDTH; hx += 14) out += `<line x1="${hx}" x2="${hx - 8}" y1="${f1(y0s)}" y2="${f1(y0s + 8)}" class="pm-hatch"/>`;
      continue;
    }
    const len = param(surface.length) * scale;
    const x1s = x0s + tx * len, y1s = y0s - ty * len;
    const cornerX = angle > 0 ? x1s : x0s, cornerY = angle > 0 ? y0s : y1s;
    out += `<path d="M${f1(x0s)} ${f1(y0s)}L${f1(x1s)} ${f1(y1s)}L${f1(cornerX)} ${f1(cornerY)}Z" class="pm-wedge"/><line x1="${f1(x0s)}" y1="${f1(y0s)}" x2="${f1(x1s)}" y2="${f1(y1s)}" class="pm-ground"/>`;
    const low = angle > 0 ? [x0s, y0s] : [x1s, y1s], deg = Math.abs((angle * 180) / Math.PI);
    const dir = angle > 0 ? 1 : -1;
    out += `<path d="M${f1(low[0] + dir * 38)} ${f1(low[1])}A38 38 0 0 ${angle > 0 ? 0 : 1} ${f1(low[0] + dir * 38 * Math.cos(Math.abs(angle)))} ${f1(low[1] - 38 * Math.sin(Math.abs(angle)))}" class="pm-thin"/><text x="${f1(low[0] + dir * 46)}" y="${f1(low[1] - 8)}" class="pm-label" style="text-anchor:${angle > 0 ? 'start' : 'end'}">${num(deg)}°</text>`;
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
    return [X(param(e.point[0])), Y(param(e.point[1]))];
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
    const tagged = (dx: number, dy: number, colourCss: string, label: string) => {
      const len = Math.hypot(dx, dy);
      if (len < 4) return '';
      return arrow(cx, cy, dx, dy, colourCss) + `<text x="${f1(cx + dx + (dx / len) * 9)}" y="${f1(cy + dy + (dy / len) * 9 + 4)}" class="pm-mid pm-label" style="fill:${colourCss}">${label}</text>`;
    };
    const k = 70 / sim.maxForce;
    if (model.showVelocity.includes(body.id)) out += tagged((b[2] / sim.maxSpeed) * 70, (-b[3] / sim.maxSpeed) * 70, 'var(--_2)', 'v');
    if (model.showWeight.includes(body.id)) out += tagged(0, sim.weight[i] * k, 'var(--_1)', 'W');
    if (model.showNormal.includes(body.id)) out += tagged(b[7] * k, -b[8] * k, 'var(--_4)', 'N');
    if (model.showFriction.includes(body.id)) out += tagged(b[9] * k, -b[10] * k, 'var(--_ink)', 'f');
    if (model.showForce.includes(body.id)) out += tagged(b[4] * k, -b[5] * k, 'var(--_3)', 'F');
  });

  plots(model, sim, SCENE_H).forEach(({ plot, ids }) => {
    out += plot.svg + plot.cursor(sample.t, ids.map((s) => seriesValue(sample, sim.bodyIds, s)));
  });

  return svgWrap(out, height, describe(model, sim, at), STYLE, options.idPrefix ?? 'pm');
}

/** One moment in plain words, for screen readers. */
export function describe(model: Model, sim: Simulation, index: number): string {
  const at = Math.min(Math.max(Math.round(index), 0), sim.samples.length - 1);
  const s = sim.samples[at];
  const parts = model.bodies.map((b, i) => `${b.id} at x ${num(s.b[i][0])} m, y ${num(s.b[i][1])} m, moving at ${num(Math.hypot(s.b[i][2], s.b[i][3]))} m/s`);
  return `${model.title ? `${model.title}. ` : ''}At ${num(s.t)} seconds: ${parts.join('; ')}.`;
}

/** The note that applies at time `t` (the last one at or before it), or the title when there is none yet. */
export function captionAt(model: Model, t: number): string {
  let text = model.title ?? '';
  for (const n of model.notes) if (n.t <= t + 1e-9) text = n.text;
  return text;
}

export { BASE_STYLE };
