import { esc } from '@learnatu/textmap-core';
/**
 * Small drawing helpers every scene shares, so they all look and theme the same way.
 * Colours come from CSS variables with fallbacks. Set --pm-ink, --pm-muted, --pm-card, --pm-line, --pm-brand and
 * --pm-1 ... --pm-4 to match your page; the --am-*, --fm-* variables and the site's own --ink, --muted, --surface and
 * --line are used when those are not set.
 */
export const WIDTH = 720;

export { esc };
export const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
export const f2 = (v: number) => (Math.round(v * 100) / 100).toString();
/** Three significant figures, no trailing zeros: 0.0123, 12.3, 1.23e+6. */
export const num = (v: number): string => (v === 0 || !Number.isFinite(v) ? String(v === 0 ? 0 : v) : parseFloat(v.toPrecision(3)).toString());

/** A length with a sensible prefix: 0.03 → "3 cm", 4e-7 → "400 nm", 2e9 → "2 Gm". */
export function siLength(m: number): string {
  const a = Math.abs(m);
  if (a === 0) return '0 m';
  const table: [number, string][] = [[1e9, 'Gm'], [1e6, 'Mm'], [1e3, 'km'], [1, 'm'], [1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm']];
  const [factor, unit] = table.find(([f]) => a >= f * 0.999) ?? table[table.length - 1];
  return `${num(m / factor)} ${unit}`;
}

/** A time with a sensible prefix: 2e-14 → "20 fs", 0.003 → "3 ms". */
export function siTime(s: number): string {
  const a = Math.abs(s);
  if (a === 0) return '0 s';
  const table: [number, string][] = [[1, 's'], [1e-3, 'ms'], [1e-6, 'µs'], [1e-9, 'ns'], [1e-12, 'ps'], [1e-15, 'fs']];
  const [factor, unit] = table.find(([f]) => a >= f * 0.999) ?? table[table.length - 1];
  return `${num(s / factor)} ${unit}`;
}

/** The colour of light of a wavelength in metres (about 380 to 750 nm), or null when the eye cannot see it. */
export function wavelengthColour(m: number): string | null {
  const w = m * 1e9;
  if (w < 380 || w > 750) return null;
  let r = 0, g = 0, b = 0;
  if (w < 440) { r = (440 - w) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; } else if (w < 510) { g = 1; b = (510 - w) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; } else if (w < 645) { r = 1; g = (645 - w) / 65; } else r = 1;
  const edge = w < 420 ? 0.3 + (0.7 * (w - 380)) / 40 : w > 700 ? 0.3 + (0.7 * (750 - w)) / 50 : 1;
  const c = (x: number) => Math.round(255 * (x * edge) ** 0.8);
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/** 1, 2 or 5 times a power of ten, at most `x`. */
export function nice(x: number): number {
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
}

export const COLOURS = ['var(--_1)', 'var(--_2)', 'var(--_3)', 'var(--_4)'];
export const colour = (i: number) => COLOURS[i % COLOURS.length];

export const BASE_STYLE = `
.pm{--_ink:var(--pm-ink,var(--am-ink,var(--fm-ink,var(--ink,#17332e))));--_muted:var(--pm-muted,var(--am-muted,var(--fm-muted,var(--muted,#60706c))));--_card:var(--pm-card,var(--am-card,var(--fm-card,var(--surface,#fff))));--_line:var(--pm-line,var(--am-line,var(--fm-line,var(--line,#dfe8e3))));
--_brand:var(--pm-brand,var(--am-brand,var(--fm-brand,var(--brand,#0b8f7a))));--_1:var(--pm-1,var(--fm-flow-1,#4152e0));--_2:var(--pm-2,var(--fm-flow-5,#d6335a));--_3:var(--pm-3,var(--fm-flow-4,#0b8f7a));--_4:var(--pm-4,var(--fm-warn,#e8890c));
font-family:var(--pm-font,var(--am-font,var(--fm-font,inherit)))}
.pm text{font:600 12px sans-serif;fill:var(--_muted)}
.pm .pm-axis{stroke:var(--_line);stroke-width:1.2;fill:none}
.pm .pm-body{stroke:var(--_ink);stroke-width:1.8}
.pm .pm-name{font:700 12.5px sans-serif;fill:var(--_ink)}
.pm .pm-arrow{stroke-width:3;fill:none;stroke-linecap:round}.pm .pm-head{stroke:none}
.pm .pm-scale{stroke:var(--_ink);stroke-width:1.8}
.pm .pm-clock{font:700 13px ui-monospace,monospace;fill:var(--_ink);text-anchor:end}
.pm .pm-series{fill:none;stroke-width:2.2;stroke-linejoin:round}
.pm .pm-cursor{stroke:var(--_ink);stroke-width:1.4;stroke-dasharray:3 3}
.pm .pm-tick{font:600 11px ui-monospace,monospace;fill:var(--_muted)}
.pm .pm-end{text-anchor:end}.pm .pm-mid{text-anchor:middle}
.pm .pm-label{font:700 13px sans-serif;fill:var(--_ink)}.pm .pm-soft{font:600 12px sans-serif;fill:var(--_muted)}
.pm .pm-thin{stroke:var(--_muted);stroke-width:1.2;fill:none}
.pm .pm-ink{stroke:var(--_ink);stroke-width:2.2;fill:none;stroke-linecap:round;stroke-linejoin:round}
`;

/** Wraps scene content in the SVG every scene uses. */
export function svgWrap(content: string, height: number, label: string, extraStyle = '', id = 'pm'): string {
  return `<svg class="pm" id="${esc(id)}" viewBox="0 0 ${WIDTH} ${height}" width="100%" style="max-width:${WIDTH}px;height:auto" role="img" aria-label="${esc(label)}"><style>${BASE_STYLE}${extraStyle}</style>${content}</svg>`;
}

export function arrow(x: number, y: number, dx: number, dy: number, stroke: string, head = 8, halfWidth = 4.5): string {
  const len = Math.hypot(dx, dy);
  if (len < 4) return '';
  const ux = dx / len, uy = dy / len;
  const x2 = x + dx, y2 = y + dy;
  return `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x2 - ux * head)}" y2="${f1(y2 - uy * head)}" class="pm-arrow" stroke="${stroke}"/>` +
    `<polygon points="${f1(x2)},${f1(y2)} ${f1(x2 - ux * head - uy * halfWidth)},${f1(y2 - uy * head + ux * halfWidth)} ${f1(x2 - ux * head + uy * halfWidth)},${f1(y2 - uy * head - ux * halfWidth)}" class="pm-head" fill="${stroke}"/>`;
}

export interface PlotSeries { name: string; xs: number[]; ys: number[] }
export interface PlotSpec {
  top: number; height: number;
  series: PlotSeries[];
  /** What the x axis runs over, as the reader sees it: "0 s" and "6 s". */
  xFrom: number; xTo: number; xFromLabel: string; xToLabel: string;
  unit: string;
  /** Force the y range (otherwise it fits the data with a little room). */
  yFrom?: number; yTo?: number;
  /** Draw a dashed line at y = 0 when the range crosses it. */
  left?: number;
}
export interface Plot { svg: string; cursor(x: number, ys: number[]): string; height: number }

/** A graph panel: axes, one line per series, a legend, and a `cursor` that draws the moving marker for one moment. */
export function makePlot(spec: PlotSpec): Plot {
  const left = spec.left ?? 72;
  const w = WIDTH - left - 14;
  const h = spec.height - 46;
  const y0 = spec.top + 26;
  let lo = spec.yFrom ?? Math.min(...spec.series.flatMap((s) => s.ys));
  let hi = spec.yTo ?? Math.max(...spec.series.flatMap((s) => s.ys));
  if (!(hi > lo)) { lo -= 1; hi += 1; }
  if (spec.yFrom === undefined && spec.yTo === undefined) { const pad = (hi - lo) * 0.08; lo -= pad; hi += pad; }
  const span = spec.xTo - spec.xFrom || 1;
  const px = (x: number) => left + ((x - spec.xFrom) / span) * w;
  const py = (v: number) => y0 + h - ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * h;
  let svg = `<rect x="${left}" y="${y0}" width="${w}" height="${h}" class="pm-axis"/>`;
  if (lo < 0 && hi > 0) svg += `<line x1="${left}" x2="${left + w}" y1="${f1(py(0))}" y2="${f1(py(0))}" class="pm-axis" stroke-dasharray="4 4"/>`;
  spec.series.forEach((s, k) => {
    const d = s.ys.map((v, j) => `${j ? 'L' : 'M'}${f1(px(s.xs[j]))} ${f1(py(v))}`).join('');
    svg += `<path d="${d}" class="pm-series" stroke="${colour(k)}"/>`;
  });
  svg += `<text x="${left - 6}" y="${y0 + 4}" class="pm-tick pm-end">${num(hi)}</text><text x="${left - 6}" y="${y0 + h}" class="pm-tick pm-end">${num(lo)}</text>`;
  svg += `<text x="${left}" y="${y0 + h + 14}" class="pm-tick">${esc(spec.xFromLabel)}</text><text x="${left + w}" y="${y0 + h + 14}" class="pm-tick pm-end">${esc(spec.xToLabel)}</text>`;
  let lx = left;
  spec.series.forEach((s, k) => {
    const name = spec.unit ? `${s.name} (${spec.unit})` : s.name;
    svg += `<rect x="${lx}" y="${spec.top + 8}" width="14" height="4" rx="2" fill="${colour(k)}"/><text x="${lx + 19}" y="${spec.top + 14}">${esc(name)}</text>`;
    lx += 19 + name.length * 7 + 14;
  });
  return {
    svg, height: spec.height,
    cursor(x, ys) {
      const cx = px(x);
      let out = `<line x1="${f1(cx)}" x2="${f1(cx)}" y1="${y0}" y2="${y0 + h}" class="pm-cursor"/>`;
      ys.forEach((v, j) => { out += `<circle cx="${f1(cx)}" cy="${f1(py(v))}" r="4" fill="${colour(j)}" stroke="var(--_card)" stroke-width="1.5"/>`; });
      return out;
    }
  };
}

/** Clamp `i` to a valid moment index. */
export const clampIndex = (i: number, count: number) => Math.min(Math.max(Math.round(i), 0), count - 1);

/** Makes a note list work like captions: the last note at or before `at` wins. */
export function captionFrom(title: string | undefined, notes: { at: number; text: string }[], at: number): string {
  let text = title ?? '';
  for (const n of notes) if (n.at <= at + 1e-9) text = n.text;
  return text;
}
