import type { Vec } from './types.ts';
import type { Run, Scene, KindInfo } from './scene.ts';
import { NONE, list, suggest, val } from './core.ts';
import type { Ctx, Statement } from './core.ts';
import { dim } from './units.ts';
import { WIDTH, arrow, colour, f1, makePlot, nice, num, siLength, siTime, svgWrap, wavelengthColour } from './draw.ts';

/** What this kind is for and the words it understands: shown in the playground's field guide. */
export const INFO: KindInfo = {
  title: 'Waves: light and sound',
  summary: 'Rings from point sources, interference, the Doppler effect and shock cones, probes, and fringes from slits.',
  cannot: 'Polarisation, reflection from surfaces, 3D waves, anything that needs solving Maxwell\'s equations.',
  words: ['medium', 'source', 'slits', 'screen', 'probe', 'plot', 'run', 'note']
};

/**
 * `scene wave`: light and sound as waves. Two modes.
 *   Point sources: rings that spread out at the wave speed, interference of sources with the same frequency,
 *     a moving source (the Doppler effect, a shock cone), and probes that record the wave at a point.
 *   Slits: the pattern of fringes light makes after one or two narrow gaps.
 * The medium decides what is allowed: sound needs a material, a moving source only makes sense for sound
 * (for light it needs relativity), and sound waves in air cannot be polarised.
 */
const L = dim(1, 0, 0);
const SPEED = dim(1, 0, -1);
const FREQ = dim(0, 0, -1);
const T = dim(0, 0, 1);

export const MEDIA: Record<string, { speed: number; kind: 'sound' | 'light' }> = {
  air: { speed: 343, kind: 'sound' }, water: { speed: 1482, kind: 'sound' }, steel: { speed: 5960, kind: 'sound' },
  vacuum: { speed: 299792458, kind: 'light' }, glass: { speed: 299792458 / 1.5, kind: 'light' }
};
const KEYWORDS = ['title', 'assume', 'param', 'predict', 'medium', 'source', 'slits', 'light', 'screen', 'probe', 'plot', 'run', 'note', 'polarise'];
const ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
const STYLE = `
.pm .pm-ring{fill:none;stroke-width:2}
.pm .pm-heat{stroke:none}
.pm .pm-wall{fill:var(--_ink)}
.pm .pm-screen{fill:var(--_card);stroke:var(--_ink);stroke-width:1.6}
`;

/** A time as the author wrote it: seconds, or a number of periods of the first source. */
type TimeSpec = { seconds: number } | { periods: number };

interface Src { id: string; line: number; at: Vec; f: number | { param: string }; phase: number | { param: string }; v?: Vec }
interface Probe { id: string; line: number; at: Vec }

export function parseWave(ctx: Ctx, stmts: Statement[]): Scene | null {
  const { problem, args } = ctx;
  let medium: string | undefined;
  const sources: Src[] = [];
  const probes: Probe[] = [];
  const plotIds: { line: number; ids: string[] }[] = [];
  let slits: { line: number; d: number | { param: string }; a: number | { param: string }; wavelength?: number | { param: string }; f?: number | { param: string } } | undefined;
  let screen: { distance: number | { param: string } } | undefined;
  let run: TimeSpec | undefined;
  const notes: { line: number; at: TimeSpec; text: string }[] = [];

  const timeSpec = (text: string, what: string, line: number): TimeSpec | null => {
    const m = /^(\d*\.?\d+)\s*(T|periods?)$/.exec(text);
    if (m) return { periods: Number(m[1]) };
    const s = ctx.fixed(text, T, what, line);
    return s === null ? null : { seconds: s };
  };

  for (const { line, command, rest } of stmts) {
    if (ctx.common({ line, command, rest })) continue;
    switch (command) {
      case 'medium': {
        const name = rest[0]?.text;
        if (!name) { problem(line, `say what the wave travels in: medium air. Choices: ${list(Object.keys(MEDIA))}`); break; }
        if (!MEDIA[name]) { problem(line, `I don't know the medium "${name}".${suggest(name, Object.keys(MEDIA))} Choices: ${list(Object.keys(MEDIA))}`); break; }
        if (medium) { problem(line, 'only one medium'); break; }
        medium = name;
        break;
      }
      case 'source': {
        const a = args(rest, ['at', 'f', 'phase', 'v'], line, 'source');
        const id = a.words[0];
        if (!id || !ID.test(id)) { problem(line, 'source needs a name: source s at=(0m,0m) f=440Hz'); break; }
        if (sources.some((s) => s.id === id)) { problem(line, `there is already a source called "${id}"`); break; }
        for (const need of ['at', 'f']) if (!a.props.has(need)) problem(line, `source "${id}" needs ${need}=…`);
        const at = a.props.has('at') ? ctx.vector(a.props.get('at')?.text as string, L, 'at', line) : null;
        const f = a.props.has('f') ? ctx.value(a.props.get('f')?.text as string, FREQ, 'f', line) : null;
        const phase = a.props.has('phase') ? ctx.value(a.props.get('phase')?.text as string, NONE, 'phase', line, true) : 0;
        const v = a.props.has('v') ? ctx.vector(a.props.get('v')?.text as string, SPEED, 'v', line) : undefined;
        if (!at || f === null || phase === null || v === null) break;
        sources.push({ id, line, at, f, phase, v });
        break;
      }
      case 'slits': {
        const a = args(rest, ['d', 'width', 'wavelength', 'f'], line, 'slits');
        if (slits) { problem(line, 'only one "slits" line'); break; }
        if (!a.props.has('d')) { problem(line, 'slits needs the distance between the two slits: slits d=0.1mm wavelength=550nm'); break; }
        const d = ctx.value(a.props.get('d')?.text as string, L, 'd', line);
        const width = a.props.has('width') ? ctx.value(a.props.get('width')?.text as string, L, 'width', line) : 0;
        const wl = a.props.has('wavelength') ? ctx.value(a.props.get('wavelength')?.text as string, L, 'wavelength', line) : undefined;
        const f = a.props.has('f') ? ctx.value(a.props.get('f')?.text as string, FREQ, 'f', line) : undefined;
        if (a.props.has('wavelength') === a.props.has('f')) problem(line, 'give either wavelength=550nm (light) or f=… (then the medium sets the wavelength)');
        if (d === null || width === null || wl === null || f === null) break;
        slits = { line, d, a: width, wavelength: wl, f };
        break;
      }
      case 'light': problem(line, '"light" is not a line: for light, use medium vacuum (or glass) and give a source f=… or slits wavelength=…'); break;
      case 'screen': {
        const a = args(rest, ['at'], line, 'screen');
        if (!a.props.has('at')) { problem(line, 'screen needs a distance from the slits: screen at=1m'); break; }
        const d = ctx.value(a.props.get('at')?.text as string, L, 'at', line);
        if (d !== null) screen = { distance: d };
        break;
      }
      case 'probe': {
        const a = args(rest, ['at'], line, 'probe');
        const id = a.words[0];
        if (!id || !ID.test(id) || !a.props.has('at')) { problem(line, 'probe needs a name and a place: probe p at=(3m,0m)'); break; }
        const at = ctx.vector(a.props.get('at')?.text as string, L, 'at', line);
        if (at) probes.push({ id, line, at });
        break;
      }
      case 'plot': {
        if (!rest.length) { problem(line, 'plot needs probe names: plot p1 p2'); break; }
        plotIds.push({ line, ids: rest.map((t) => t.text) });
        break;
      }
      case 'run': {
        if (run) { problem(line, 'only one "run" line'); break; }
        const t = rest[0] ? timeSpec(rest[0].text, 'run', line) : (problem(line, 'run needs a time: run 4periods, or run 20ms'), null);
        if (t) run = t;
        break;
      }
      case 'note': {
        const t = rest[0] ? timeSpec(rest[0].text, 'note time', line) : null;
        if (!rest[0] || !rest[1]?.quoted) problem(line, 'note needs a time and text in quotes: note 2periods "The crests bunch up ahead."');
        else if (t) notes.push({ line, at: t, text: rest[1].text });
        break;
      }
      case 'polarise':
      case 'polarize':
        if (medium && MEDIA[medium].kind === 'sound') problem(line, `sound waves in ${medium} are longitudinal, so they cannot be polarised. Polarisation belongs to light (transverse waves).`);
        else problem(line, 'polarisation is planned but not available yet');
        break;
      default:
        problem(line, `I don't know "${command}".${suggest(command, KEYWORDS)} Words I know: ${list(KEYWORDS)}`);
    }
  }

  const errors = ctx.problems.length;
  const kind = medium ? MEDIA[medium].kind : undefined;
  if (slits && sources.length) problem(slits.line, 'a wave scene is either point sources or slits, not both');
  if (!slits && !sources.length && !errors) problem(1, 'add a source (source s at=(0m,0m) f=440Hz) or slits (slits d=0.1mm wavelength=550nm)');
  if (!slits && !medium && !errors) problem(1, 'say what the wave travels in: medium air');
  if (slits) {
    if (slits.wavelength === undefined && !medium) problem(slits.line, 'slits with f=… needs a medium to give the wavelength');
    if (!screen && !errors) problem(slits.line, 'slits needs a screen: screen at=1m');
    if (probes.length || run || notes.length || plotIds.length) problem(slits.line, 'a slits scene does not change with time, so it has no probes, plots, notes or run');
  } else {
    if (!run && !errors && sources.length) problem(1, 'say how long to run: run 4periods');
    if (screen) problem(screen ? 1 : 0, 'screen belongs to a slits scene');
    for (const s of sources) {
      if (s.v && kind === 'light') problem(s.line, 'a moving source of light needs relativity (the Doppler effect for light is different). Use a spacetime scene, or a sound medium.');
    }
    for (const p of plotIds) for (const id of p.ids) if (!probes.some((pr) => pr.id === id)) problem(p.line, `there is no probe called "${id}".${suggest(id, probes.map((pr) => pr.id))}`);
  }
  if (ctx.problems.length) return null;

  const images: { line: number; ref: string }[] = [];
  const params = [...ctx.params.values()];
  const base = { kind: 'wave' as const, title: ctx.title, assumptions: ctx.assumptions, params, predicts: ctx.predicts, images };

  if (slits) return { ...base, playSeconds: 0, run: (values) => slitsRun(ctx, slits as NonNullable<typeof slits>, screen as NonNullable<typeof screen>, medium, values) };

  const med = MEDIA[medium as string];
  return {
    ...base,
    playSeconds: 8,
    run: (values) => pointRun(ctx.title, med, medium as string, sources, probes, plotIds, run as TimeSpec, notes, values)
  };
}

// ---------- point sources ----------

const COUNT = 121;

function seconds(t: TimeSpec, period: number): number { return 'seconds' in t ? t.seconds : t.periods * period; }

function pointRun(title: string | undefined, med: { speed: number; kind: string }, mediumName: string, sources: Src[], probes: Probe[], plotIds: { ids: string[] }[], runSpec: TimeSpec, notes: { at: TimeSpec; text: string }[], values: Record<string, number>): Run {
  const c = med.speed;
  const S = sources.map((s) => ({
    id: s.id, f: val(s.f, values), phase: val(s.phase, values), x: val(s.at[0], values), y: val(s.at[1], values),
    vx: s.v ? val(s.v[0], values) : 0, vy: s.v ? val(s.v[1], values) : 0
  }));
  const moving = S.some((s) => s.vx || s.vy);
  const period = 1 / S[0].f;
  const duration = Math.max(seconds(runSpec, period), 1e-300);
  const lambda = Math.min(...S.map((s) => c / s.f));
  const ok = S.every((s) => Number.isFinite(s.f) && s.f > 0);
  const same = S.every((s) => Math.abs(s.f - S[0].f) < 1e-9 * S[0].f);
  const supersonic = S.some((s) => Math.hypot(s.vx, s.vy) >= c);

  // what the picture shows: the sources and where they go, with room for several wavelengths
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of S) for (const t of [0, duration]) {
    x0 = Math.min(x0, s.x + s.vx * t); x1 = Math.max(x1, s.x + s.vx * t);
    y0 = Math.min(y0, s.y + s.vy * t); y1 = Math.max(y1, s.y + s.vy * t);
  }
  for (const p of probes) { const px = val(p.at[0], values), py = val(p.at[1], values); x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
  const pad = 7 * lambda;
  x0 -= pad; x1 += pad; y0 -= pad * 0.6; y1 += pad * 0.6;
  let w = x1 - x0, h = y1 - y0;
  if (h < w / 2) { const cy = (y0 + y1) / 2; h = w / 2; y0 = cy - h / 2; y1 = cy + h / 2; } else { const cx = (x0 + x1) / 2; w = h * 2; x0 = cx - w / 2; x1 = cx + w / 2; }
  const SH = 330;
  const scale = WIDTH / (x1 - x0);
  const sceneH = Math.round((y1 - y0) * scale);
  const sceneHeight = Math.min(SH, Math.max(sceneH, 180));
  const X = (x: number) => (x - x0) * scale;
  const Y = (y: number) => sceneHeight / 2 + ((y0 + y1) / 2 - y) * scale;

  // the pattern that stays put when the sources do not move and share a frequency
  let heat = '';
  if (ok && same && !moving && S.length > 1) {
    const cell = 12, cols = Math.ceil(WIDTH / cell), rows = Math.ceil(sceneHeight / cell);
    const cells: number[] = [];
    let top = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const gx = x0 + ((i + 0.5) * cell) / scale, gy = y1 - ((j + 0.5) * cell) / scale;
      let re = 0, im = 0;
      for (const s of S) { const r = Math.hypot(gx - s.x, gy - s.y); const a = 1 / Math.sqrt(1 + r / lambda); const ph = (2 * Math.PI * r) / lambda - s.phase; re += a * Math.cos(ph); im += a * Math.sin(ph); }
      const v = re * re + im * im;
      cells.push(v); top = Math.max(top, v);
    }
    const LEVELS = 8;
    const paths: string[] = Array.from({ length: LEVELS }, () => '');
    cells.forEach((v, k) => {
      const level = Math.min(LEVELS - 1, Math.floor((v / top) * LEVELS));
      if (level === 0) return;
      paths[level] += `M${(k % cols) * cell} ${Math.floor(k / cols) * cell}h${cell}v${cell}h-${cell}z`;
    });
    paths.forEach((d, level) => { if (d) heat += `<path d="${d}" class="pm-heat" fill="var(--_brand)" fill-opacity="${(0.08 + (0.7 * level) / (LEVELS - 1)).toFixed(2)}" shape-rendering="crispEdges"/>`; });
  }

  // probes: the wave at a point, over the whole run
  const hasPlot = ok && plotIds.length > 0 && !supersonic;
  const probeValue = (px: number, py: number, t: number): number => {
    let sum = 0;
    for (const s of S) {
      let tr = t;
      for (let k = 0; k < 40; k++) tr = t - Math.hypot(px - (s.x + s.vx * tr), py - (s.y + s.vy * tr)) / c;
      const r = Math.hypot(px - (s.x + s.vx * tr), py - (s.y + s.vy * tr));
      sum += Math.cos(2 * Math.PI * s.f * tr - s.phase) / Math.sqrt(1 + r / lambda);
    }
    return sum;
  };
  const times = Array.from({ length: COUNT }, (_, i) => (i / (COUNT - 1)) * duration);
  const plots = hasPlot ? plotIds.map((p, k) => {
    const ys = p.ids.map((id) => { const pr = probes.find((q) => q.id === id) as Probe; const px = val(pr.at[0], values), py = val(pr.at[1], values); return times.map((t) => probeValue(px, py, t)); });
    return { ids: p.ids, ys, plot: makePlot({ top: sceneHeight + k * 120, height: 120, unit: '', xFrom: 0, xTo: duration / period, xFromLabel: '0 periods', xToLabel: `${num(duration / period)} periods`, series: p.ids.map((id, j) => ({ name: id, xs: times.map((t) => t / period), ys: ys[j] })) }) };
  }) : [];
  const height = sceneHeight + plots.length * 120;

  // the words that follow the physics
  let physics = '';
  if (S.length === 1 && (S[0].vx || S[0].vy)) {
    const sp = Math.hypot(S[0].vx, S[0].vy), mach = sp / c;
    physics = mach < 1
      ? `Source moving at ${num(mach)} times the wave speed: heard ahead at ${num(S[0].f / (1 - mach))} Hz, behind at ${num(S[0].f / (1 + mach))} Hz.`
      : `Mach ${num(mach)}: the waves pile up into a shock cone with half-angle ${num((Math.asin(1 / mach) * 180) / Math.PI)}°.`;
  }
  const noteList = notes.map((n) => ({ at: seconds(n.at, period), text: n.text })).sort((a, b) => a.at - b.at);
  const captionAt = (i: number) => {
    const t = times[i];
    let text = title ?? '';
    for (const n of noteList) if (n.at <= t + 1e-12 * duration) text = n.text;
    return [text, physics].filter(Boolean).join(' ');
  };

  return {
    count: COUNT, ok, problem: ok ? undefined : 'The frequency must be above zero.',
    caption: captionAt,
    clock: (i) => `${num(times[i] / period)} / ${num(duration / period)} periods`,
    describe: (i) => `${title ? `${title}. ` : ''}${mediumName} wave from ${S.length} source${S.length > 1 ? 's' : ''}, wavelength ${siLength(lambda)}, at ${num(times[i] / period)} periods (${siTime(times[i])}). ${physics}`,
    svg(i, options) {
      const t = times[i];
      const clip = `${options?.idPrefix ?? 'pm'}-clip`;
      let out = `<clipPath id="${clip}"><rect width="${WIDTH}" height="${sceneHeight}"/></clipPath><g clip-path="url(#${clip})">${heat}`;
      const R = Math.hypot(x1 - x0, y1 - y0);
      S.forEach((s, k) => {
        const lam = c / s.f;
        const crests = Math.min(60, Math.ceil(R / lam) + 2);
        // the n-th crest left the source at tn; it has been travelling since then
        const first = Math.floor(s.f * t - s.phase / (2 * Math.PI));
        for (let n = 0; n < crests; n++) {
          const tn = (first - n + s.phase / (2 * Math.PI)) / s.f;
          const age = t - tn;
          if (age < 0) continue;
          const r = c * age * scale;
          const cx = X(s.x + s.vx * tn), cy = Y(s.y + s.vy * tn);
          const opacity = Math.max(0.12, 0.9 / (1 + (c * age) / lam / 7));
          if (r > 3 && r < 4 * WIDTH) out += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" class="pm-ring" stroke="${colour(k)}" stroke-opacity="${opacity.toFixed(2)}"/>`;
        }
      });
      if (S.length === 1 && Math.hypot(S[0].vx, S[0].vy) > c) {
        const s = S[0], a = Math.asin(c / Math.hypot(s.vx, s.vy)), px = X(s.x + s.vx * t), py = Y(s.y + s.vy * t), dir = Math.sign(s.vx) || 1, len = 400;
        out += `<path d="M${f1(px - dir * len * Math.cos(a))} ${f1(py - len * Math.sin(a))}L${f1(px)} ${f1(py)}L${f1(px - dir * len * Math.cos(a))} ${f1(py + len * Math.sin(a))}" class="pm-ink" stroke="var(--_2)" stroke-dasharray="6 4"/>`;
      }
      S.forEach((s, k) => {
        const px = X(s.x + s.vx * t), py = Y(s.y + s.vy * t);
        out += `<circle cx="${f1(px)}" cy="${f1(py)}" r="7" class="pm-body" fill="${colour(k)}"/><text x="${f1(px + 11)}" y="${f1(py - 9)}" class="pm-name">${s.id}</text>`;
        if (s.vx || s.vy) { const sp = Math.hypot(s.vx, s.vy); out += arrow(px, py, (s.vx / sp) * 38, (-s.vy / sp) * 38, 'var(--_ink)'); }
      });
      probes.forEach((p) => {
        const px = X(val(p.at[0], values)), py = Y(val(p.at[1], values));
        out += `<rect x="${f1(px - 5)}" y="${f1(py - 5)}" width="10" height="10" fill="var(--_card)" stroke="var(--_ink)" stroke-width="2"/><text x="${f1(px + 9)}" y="${f1(py + 4)}" class="pm-name">${p.id}</text>`;
      });
      out += '</g>';
      const lamPx = lambda * scale;
      out += `<g><line x1="24" x2="${f1(24 + lamPx)}" y1="${sceneHeight - 16}" y2="${sceneHeight - 16}" class="pm-scale"/><text x="24" y="${sceneHeight - 22}">wavelength ${siLength(lambda)}</text></g>`;
      out += `<text x="${WIDTH - 12}" y="22" class="pm-clock">${mediumName}, t = ${num(t / period)} T</text>`;
      plots.forEach((p) => { out += p.plot.svg + p.plot.cursor(t / period, p.ys.map((y) => y[i])); });
      return svgWrap(out, height, `wave scene, ${num(t / period)} periods`, STYLE, options?.idPrefix ?? 'pm');
    }
  };
}

// ---------- slits ----------

function slitsRun(ctx: Ctx, slits: { d: number | { param: string }; a: number | { param: string }; wavelength?: number | { param: string }; f?: number | { param: string } }, screen: { distance: number | { param: string } }, medium: string | undefined, values: Record<string, number>): Run {
  const d = val(slits.d, values), a = val(slits.a, values), L0 = val(screen.distance, values);
  const speed = medium ? MEDIA[medium].speed : 299792458;
  const lambda = slits.wavelength !== undefined ? val(slits.wavelength, values) : speed / val(slits.f as number, values);
  const colourCss = (!medium || MEDIA[medium].kind === 'light') ? wavelengthColour(lambda) : null;
  const ok = [d, a, L0, lambda].every((v) => Number.isFinite(v)) && d > 0 && L0 > 0 && lambda > 0 && a >= 0 && (a === 0 || a < d);
  const spacing = (lambda * L0) / d;
  const yMax = 6 * spacing;
  const intensity = (y: number) => {
    const s = y / Math.hypot(y, L0);
    const alpha = (Math.PI * d * s) / lambda;
    const beta = (Math.PI * a * s) / lambda;
    const sinc = a > 0 && Math.abs(beta) > 1e-12 ? Math.sin(beta) / beta : 1;
    return Math.cos(alpha) ** 2 * sinc ** 2;
  };
  const N = 400;
  const ys = Array.from({ length: N }, (_, i) => -yMax + (2 * yMax * i) / (N - 1));
  const I = ys.map(intensity);
  const plot = makePlot({ top: 224, height: 150, unit: '', yFrom: 0, yTo: 1.05, xFrom: -yMax * 1000, xTo: yMax * 1000, xFromLabel: `${num(-yMax * 1000)} mm`, xToLabel: `${num(yMax * 1000)} mm`, series: [{ name: 'brightness on the screen', xs: ys.map((y) => y * 1000), ys: I }] });
  const bright = colourCss ?? 'var(--_brand)';
  const text = `Fringes ${siLength(spacing)} apart (wavelength × screen distance ÷ slit spacing)${a > 0 ? `; the dimming envelope has its first zero at ±${siLength((lambda * L0) / a)}` : ''}.`;
  return {
    count: 1, ok, problem: ok ? undefined : 'These numbers do not make a slit pattern: the slit width must be smaller than the spacing, and everything must be above zero.',
    caption: () => `${ctx.title ? `${ctx.title}. ` : ''}${text}`,
    clock: () => '',
    describe: () => `Slit pattern for ${siLength(lambda)} waves: ${text}`,
    svg(_i, options) {
      let out = '';
      // schematic, not to scale: the wall with two slits, rays to the screen, and the fringes as a strip
      const wallX = 110, screenX = 600, s1 = 96, s2 = 116, mid = 106;
      out += `<rect x="${wallX - 5}" y="22" width="10" height="${s1 - 4 - 22}" class="pm-wall"/><rect x="${wallX - 5}" y="${s1 + 4}" width="10" height="${s2 - 4 - (s1 + 4)}" class="pm-wall"/><rect x="${wallX - 5}" y="${s2 + 4}" width="10" height="${200 - (s2 + 4)}" class="pm-wall"/>`;
      out += `<line x1="20" x2="${wallX - 5}" y1="${mid}" y2="${mid}" class="pm-ink" stroke="${bright}" stroke-dasharray="8 5"/>`;
      for (const [yy, k] of [[40, 0], [80, 1], [mid, 2], [150, 3], [185, 4]] as const) for (const sy of [s1, s2]) out += `<line x1="${wallX + 5}" y1="${sy}" x2="${screenX}" y2="${yy}" class="pm-thin" stroke-opacity="${k === 2 ? 0.55 : 0.28}"/>`;
      out += `<rect x="${screenX}" y="30" width="22" height="170" class="pm-screen"/>`;
      for (let i = 0; i < 85; i++) { const y = ys[Math.round((i / 84) * (N - 1))]; out += `<rect x="${screenX}" y="${f1(30 + (i * 170) / 85)}" width="22" height="${f1(170 / 85 + 0.4)}" fill="${bright}" fill-opacity="${intensity(y).toFixed(2)}"/>`; }
      out += `<text x="${wallX}" y="12" class="pm-mid">slits</text><text x="${screenX + 11}" y="22" class="pm-mid">screen</text><text x="${(wallX + screenX) / 2}" y="${212}" class="pm-mid pm-soft">not to scale: slits ${siLength(d)} apart, screen ${siLength(L0)} away</text>`;
      out += `<text x="20" y="${200}" class="pm-label">λ = ${siLength(lambda)}</text>`;
      out += plot.svg;
      return svgWrap(out, 224 + 150, `slit pattern, ${text}`, STYLE, options?.idPrefix ?? 'pm');
    }
  };
}
export { nice };
