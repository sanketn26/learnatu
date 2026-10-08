import type { Run, Scene } from './scene.ts';
import { list, suggest, val } from './core.ts';
import type { Ctx, Statement } from './core.ts';
import { dim } from './units.ts';
import { WIDTH, colour, f1, makePlot, num, svgWrap } from './draw.ts';

/**
 * `scene spacetime`: special relativity as a picture. Events and worldlines on a Minkowski diagram, with light
 * travelling at 45 degrees. A moving frame is declared with `frame`, and the time slider boosts the observer from the
 * rest frame S to that frame: the same events get new coordinates, simultaneity tilts, and the interval between two
 * events does not change. Flat spacetime only: no gravity, no acceleration.
 */
const C = 299792458;
const T = dim(0, 0, 1);
const L = dim(1, 0, 0);
const SPEED = dim(1, 0, -1);
const KEYWORDS = ['title', 'assume', 'param', 'predict', 'event', 'worldline', 'clock', 'frame', 'show', 'measure'];
const ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
type N = number | { param: string };

interface Ev { id: string; line: number; t: N; x: N }
interface Wl { id: string; line: number; from: string; to: string }
interface Clock { id: string; line: number; from: string; v: N; tick: number }

const STYLE = `
.pm .pm-cone{stroke:none;fill:var(--_4);fill-opacity:.1}
.pm .pm-light{stroke:var(--_4);stroke-width:1.6;fill:none;stroke-dasharray:5 4}
.pm .pm-axis2{stroke:var(--_muted);stroke-width:1.2;stroke-dasharray:4 4;fill:none}
.pm .pm-sim{stroke:var(--_ink);stroke-width:1.8;fill:none}
.pm .pm-simS{stroke:var(--_2);stroke-width:1.6;fill:none;stroke-dasharray:6 4}
`;

const UNITS: [number, string, string][] = [[365.25 * 86400, 'years', 'light-years'], [86400, 'days', 'light-days'], [1, 'seconds', 'light-seconds'], [1e-3, 'milliseconds', 'light-milliseconds'], [1e-6, 'microseconds', 'light-microseconds'], [1e-9, 'nanoseconds', 'light-nanoseconds']];

export function parseSpacetime(ctx: Ctx, stmts: Statement[]): Scene | null {
  const { problem, args } = ctx;
  const events: Ev[] = [];
  const worldlines: Wl[] = [];
  const clocks: Clock[] = [];
  let frame: { id: string; line: number; v: N } | undefined;
  const shows: { line: number; what: string; at?: string }[] = [];
  let measure: { line: number; a: string; b: string } | undefined;

  for (const { line, command, rest } of stmts) {
    if (ctx.common({ line, command, rest })) continue;
    switch (command) {
      case 'event': {
        const a = args(rest, ['at'], line, 'event');
        const id = a.words[0];
        if (!id || !ID.test(id) || !a.props.has('at')) { problem(line, 'event needs a name and (time, place): event A at=(0yr,0ly)'); break; }
        if (events.some((e) => e.id === id)) { problem(line, `there is already an event called "${id}"`); break; }
        const m = /^\((.*)\)$/.exec(a.props.get('at')?.text as string);
        const parts = m ? m[1].split(',') : [];
        if (parts.length !== 2) { problem(line, `at needs a time and a place in brackets, like (2yr,1ly); you wrote "${a.props.get('at')?.text}"`); break; }
        const t = ctx.value(parts[0].trim(), T, 'time', line);
        const x = ctx.value(parts[1].trim(), L, 'place', line);
        if (t !== null && x !== null) events.push({ id, line, t, x });
        break;
      }
      case 'worldline': {
        const a = args(rest, ['from', 'to'], line, 'worldline');
        const id = a.words[0];
        if (!id || !ID.test(id) || !a.props.has('from') || !a.props.has('to')) { problem(line, 'worldline needs a name and two events: worldline W from=A to=B'); break; }
        worldlines.push({ id, line, from: a.props.get('from')?.text as string, to: a.props.get('to')?.text as string });
        break;
      }
      case 'clock': {
        const a = args(rest, ['from', 'v', 'ticks'], line, 'clock');
        const id = a.words[0];
        if (!id || !ID.test(id) || !a.props.has('from') || !a.props.has('v')) { problem(line, 'clock needs a name, a start event and a speed: clock C from=A v=0.6c ticks=1yr'); break; }
        const v = ctx.value(a.props.get('v')?.text as string, SPEED, 'v', line);
        const tick = a.props.has('ticks') ? ctx.fixed(a.props.get('ticks')?.text as string, T, 'ticks', line) : 1;
        if (v !== null && tick !== null) clocks.push({ id, line, from: a.props.get('from')?.text as string, v, tick: tick === 1 && !a.props.has('ticks') ? 0 : tick });
        break;
      }
      case 'frame': {
        const a = args(rest, ['v'], line, 'frame');
        if (frame) { problem(line, 'only one moving frame'); break; }
        const id = a.words[0];
        if (!id || !ID.test(id) || !a.props.has('v')) { problem(line, 'frame needs a name and a speed relative to S: frame S2 v=0.6c'); break; }
        const v = ctx.value(a.props.get('v')?.text as string, SPEED, 'v', line);
        if (v !== null) frame = { id, line, v };
        break;
      }
      case 'show': {
        const what = rest[0]?.text;
        if (!what || !['lightcone', 'simultaneity'].includes(what)) { problem(line, `show needs "lightcone" or "simultaneity", then an event.${what ? suggest(what, ['lightcone', 'simultaneity']) : ''}`); break; }
        if (!rest[1]) { problem(line, `show ${what} needs an event: show ${what} A`); break; }
        shows.push({ line, what, at: rest[1].text });
        break;
      }
      case 'measure': {
        if (measure) { problem(line, 'only one "measure" line'); break; }
        if (rest.length !== 2) { problem(line, 'measure needs two events: measure A B'); break; }
        measure = { line, a: rest[0].text, b: rest[1].text };
        break;
      }
      default:
        problem(line, `I don't know "${command}".${suggest(command, KEYWORDS)} Words I know: ${list(KEYWORDS)}`);
    }
  }
  const ids = events.map((e) => e.id);
  const need = (line: number, id: string | undefined, what: string) => { if (id && !ids.includes(id)) problem(line, `${what}: there is no event called "${id}".${suggest(id, ids)}`); };
  for (const w of worldlines) { need(w.line, w.from, 'worldline'); need(w.line, w.to, 'worldline'); }
  for (const c of clocks) need(c.line, c.from, 'clock');
  for (const s of shows) need(s.line, s.at, 'show');
  if (measure) { need(measure.line, measure.a, 'measure'); need(measure.line, measure.b, 'measure'); }
  if (!events.length && !ctx.problems.length) problem(1, 'add an event: event A at=(0yr,0ly)');
  // nothing can reach the speed of light
  const fast = (v: N, line: number, what: string) => {
    if (typeof v === 'number' && Math.abs(v) >= C) problem(line, `${what} must be slower than light (below 1c)`);
    else if (typeof v === 'object') { const p = ctx.params.get(v.param); if (p && Math.max(Math.abs(p.min), Math.abs(p.max)) >= C) problem(p.line, `the slider "${p.name}" is used as a speed, so its range must stay below 1c (try 0..0.99 c)`); }
  };
  if (frame) fast(frame.v, frame.line, 'the frame speed');
  for (const c of clocks) fast(c.v, c.line, 'a clock speed');
  // a worldline is the path of something with mass, or of light: it cannot be faster than light
  for (const w of worldlines) {
    const a = events.find((e) => e.id === w.from), b = events.find((e) => e.id === w.to);
    if (a && b && [a.t, a.x, b.t, b.x].every((n) => typeof n === 'number')) {
      const dt = (b.t as number) - (a.t as number), dx = (b.x as number) - (a.x as number);
      if (!(dt > 0)) problem(w.line, `a worldline must go forward in time: ${w.to} must be later than ${w.from}`);
      else if (Math.abs(dx) > C * dt * 1.0000001) problem(w.line, `this worldline would need to go faster than light (${w.from} to ${w.to} covers ${num(Math.abs(dx) / (C * dt))}c). Events like these are spacelike: nothing can travel between them.`);
    }
  }
  if (ctx.problems.length) return null;
  return {
    kind: 'spacetime', title: ctx.title, assumptions: ['flat spacetime: no gravity, no acceleration', ...ctx.assumptions], params: [...ctx.params.values()], predicts: ctx.predicts, images: [],
    playSeconds: frame ? 6 : 0,
    run: (values) => spacetimeRun(ctx.title, events, worldlines, clocks, frame, shows, measure, values)
  };
}

const STEPS = 61;

function spacetimeRun(title: string | undefined, events: Ev[], worldlines: Wl[], clocks: Clock[], frame: { id: string; v: N } | undefined, shows: { what: string; at?: string }[], measure: { a: string; b: string } | undefined, values: Record<string, number>): Run {
  const E = events.map((e) => ({ id: e.id, t: val(e.t, values), x: val(e.x, values) }));
  const wTarget = frame ? val(frame.v, values) / C : 0;
  const ok = E.every((e) => Number.isFinite(e.t) && Number.isFinite(e.x)) && Math.abs(wTarget) < 1;
  // pick the units from the biggest time or distance in the scene
  const big = Math.max(1e-30, ...E.flatMap((e) => [Math.abs(e.t), Math.abs(e.x) / C]));
  const [tu, tname, xname] = UNITS.find(([f]) => big >= f * 0.9) ?? UNITS[UNITS.length - 1];
  const P = E.map((e) => ({ id: e.id, t: e.t / tu, x: e.x / (C * tu) }));       // c = 1: both axes in the same unit
  const count = frame ? STEPS : 1;
  const rapidity = Math.atanh(Math.min(Math.max(wTarget, -0.999999), 0.999999));
  const wAt = (i: number) => (frame ? Math.tanh(rapidity * (i / (STEPS - 1))) : 0);
  const boost = (t: number, x: number, w: number): [number, number] => { const g = 1 / Math.sqrt(1 - w * w); return [g * (t - w * x), g * (x - w * t)]; };   // → [t', x']
  const byId = (id: string) => P.find((e) => e.id === id) as { id: string; t: number; x: number };
  const K = clocks.map((c) => {
    const from = byId(c.from);
    const v = val(c.v, values) / C;
    const tick = c.tick > 0 ? c.tick / tu : 1;
    return { id: c.id, from, v, g: 1 / Math.sqrt(1 - v * v), tick, ticks: Math.max(0, Math.round(c.tick > 0 ? 0 : 0)) };
  });

  // the view: everything seen from the rest frame and from the target frame, so it holds still as the slider moves
  let tMin = 0, tMax = 0, xMin = 0, xMax = 0;
  const grow = (t: number, x: number) => { tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); xMin = Math.min(xMin, x); xMax = Math.max(xMax, x); };
  const probe = ok ? [0, ...Array.from({ length: 8 }, (_, k) => wAt(Math.round(((k + 1) / 8) * (STEPS - 1))))] : [0];
  for (const w of probe) {
    for (const e of P) grow(...boost(e.t, e.x, w));
    for (const k of K) { const end = k.from.t + k.g * 3 * (k.tick || 1), xe = k.from.x + k.g * k.v * 3 * (k.tick || 1); grow(...boost(end, xe, w)); }
  }
  const spanT = Math.max(tMax - tMin, 1e-9), spanX = Math.max(xMax - xMin, 1e-9);
  const H = 380, M = 46;
  const half = Math.max(spanT / 2, spanX / 2) * 1.3;           // a square window, so 45 degrees looks like 45 degrees
  const ct = (tMin + tMax) / 2, cx = (xMin + xMax) / 2;
  const scale = Math.min((WIDTH - 2 * M) / (2 * half * (WIDTH / H)), (H - 2 * M) / (2 * half));
  const X = (x: number) => WIDTH / 2 + (x - cx) * scale;
  const Y = (t: number) => H / 2 - (t - ct) * scale;

  const fmt = (v: number) => `${num(v)}`;
  const interval = (a: { t: number; x: number }, b: { t: number; x: number }) => { const dt = b.t - a.t, dx = b.x - a.x; return dt * dt - dx * dx; };
  const kindOf = (s2: number) => (Math.abs(s2) < 1e-12 ? 'lightlike' : s2 > 0 ? 'timelike' : 'spacelike');
  const words = (i: number) => {
    const w = wAt(i);
    const view = frame ? (Math.abs(w) < 1e-9 ? 'the rest frame S' : `${frame.id}, moving at ${num(Math.abs(w))}c ${w > 0 ? 'to the right' : 'to the left'} relative to S`) : 'the rest frame S';
    let text = `${title ? `${title}. ` : ''}Seen from ${view}.`;
    if (measure) {
      const a = byId(measure.a), b = byId(measure.b);
      const [ta, xa] = boost(a.t, a.x, w), [tb, xb] = boost(b.t, b.x, w);
      const s2 = interval(a, b);
      text += ` From ${measure.a} to ${measure.b}: Δt′ = ${fmt(tb - ta)} ${tname}, Δx′ = ${fmt(xb - xa)} ${xname}. The interval is ${kindOf(s2)}: ${s2 >= 0 ? `${fmt(Math.sqrt(s2))} ${tname} of proper time, the same for every observer` : `${fmt(Math.sqrt(-s2))} ${xname} of distance in the frame where they happen together, the same for every observer`}.`;
    }
    for (const k of K) {
      const u = (k.v - w) / (1 - k.v * w), g = 1 / Math.sqrt(1 - u * u);
      text += ` Clock ${k.id} runs slow by ×${num(g)} in this view (one of its seconds takes ${num(g)} of ours).`;
    }
    return text.trim();
  };

  // graph: how the coordinate differences change with the observer's speed, against the interval that does not
  let plot: ReturnType<typeof makePlot> | undefined;
  let sample: { dts: number[]; dxs: number[]; inv: number[]; xs: number[] } | undefined;
  if (ok && frame && measure) {
    const a = byId(measure.a), b = byId(measure.b);
    const xs = Array.from({ length: STEPS }, (_, i) => wAt(i)), dts: number[] = [], dxs: number[] = [];
    xs.forEach((w) => { const [ta, xa] = boost(a.t, a.x, w), [tb, xb] = boost(b.t, b.x, w); dts.push(tb - ta); dxs.push(xb - xa); });
    const s2 = interval(a, b), inv = xs.map(() => Math.sqrt(Math.abs(s2)));
    sample = { dts, dxs, inv, xs };
    plot = makePlot({ top: H, height: 150, unit: '', xFrom: Math.min(...xs), xTo: Math.max(...xs, 1e-9), xFromLabel: `${num(Math.min(...xs))}c`, xToLabel: `${num(Math.max(...xs))}c`, series: [{ name: `Δt′ (${tname})`, xs, ys: dts }, { name: `Δx′ (${xname})`, xs, ys: dxs }, { name: s2 >= 0 ? 'interval: proper time, fixed' : 'interval: proper distance, fixed', xs, ys: inv }] });
  }

  return {
    count, ok, problem: ok ? undefined : 'The speed must be below the speed of light (1c).',
    caption: words, clock: (i) => (frame ? `observer at ${num(wAt(i))}c` : ''), describe: words,
    svg(i, options) {
      const w = wAt(i);
      const clip = `${options?.idPrefix ?? 'pm'}-clip`;
      let out = `<clipPath id="${clip}"><rect width="${WIDTH}" height="${H}"/></clipPath><g clip-path="url(#${clip})">`;
      const at = (t: number, x: number) => { const [tt, xx] = boost(t, x, w); return [X(xx), Y(tt)] as const; };
      const big2 = half * 6;
      // the rest frame's own axes, tilted by the boost, and the observer's axes
      for (const [dt, dx, name] of [[1, 0, 'ct (S)'], [0, 1, 'x (S)']] as const) {
        const [x1, y1] = at(-dt * big2, -dx * big2), [x2, y2] = at(dt * big2, dx * big2);
        out += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" class="pm-axis2"/>`;
        const [lx, ly] = at(dt * half * 1.05, dx * half * 1.05);
        out += `<text x="${f1(Math.min(Math.max(lx + 6, 6), WIDTH - 60))}" y="${f1(Math.min(Math.max(ly - 4, 14), H - 30))}" class="pm-soft">${name}</text>`;
      }
      out += `<line x1="0" x2="${WIDTH}" y1="${f1(Y(0))}" y2="${f1(Y(0))}" class="pm-axis"/><line x1="${f1(X(0))}" x2="${f1(X(0))}" y1="0" y2="${H}" class="pm-axis"/>`;
      // light cones: always at 45 degrees, in every frame
      for (const s of shows.filter((q) => q.what === 'lightcone')) {
        const e = byId(s.at as string), [t0, x0] = boost(e.t, e.x, w);
        const px = X(x0), py = Y(t0), r = half * scale * 3;
        out += `<path d="M${f1(px)} ${f1(py)}L${f1(px - r)} ${f1(py - r)}L${f1(px + r)} ${f1(py - r)}Z" class="pm-cone"/><path d="M${f1(px)} ${f1(py)}L${f1(px - r)} ${f1(py + r)}L${f1(px + r)} ${f1(py + r)}Z" class="pm-cone" fill-opacity=".05"/>`;
        out += `<path d="M${f1(px - r)} ${f1(py - r)}L${f1(px + r)} ${f1(py + r)}M${f1(px - r)} ${f1(py + r)}L${f1(px + r)} ${f1(py - r)}" class="pm-light"/>`;
      }
      // lines of simultaneity: level in the view, tilted when drawn for the rest frame
      for (const s of shows.filter((q) => q.what === 'simultaneity')) {
        const e = byId(s.at as string), [t0, x0] = boost(e.t, e.x, w);
        out += `<line x1="0" x2="${WIDTH}" y1="${f1(Y(t0))}" y2="${f1(Y(t0))}" class="pm-sim"/><text x="10" y="${f1(Y(t0) - 6)}" class="pm-label">same time in this view</text>`;
        const [ax, ay] = at(e.t, e.x - big2), [bx, by] = at(e.t, e.x + big2);
        out += `<line x1="${f1(ax)}" y1="${f1(ay)}" x2="${f1(bx)}" y2="${f1(by)}" class="pm-simS"/>`;
        if (Math.abs(w) > 0.02) out += `<text x="${WIDTH - 10}" y="${f1(Y(t0 + (-w) * ((WIDTH - 10 - X(x0)) / scale)) - 6)}" class="pm-end pm-soft" style="fill:var(--_2)">same time in S</text>`;
      }
      out += '</g>';
      // worldlines and clocks
      for (const wl of worldlines) {
        const a = byId(wl.from), b = byId(wl.to);
        const [x1, y1] = at(a.t, a.x), [x2, y2] = at(b.t, b.x);
        out += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" class="pm-ink" stroke="var(--_3)" style="stroke-width:3"/><text x="${f1((x1 + x2) / 2 + 8)}" y="${f1((y1 + y2) / 2)}" class="pm-name">${wl.id}</text>`;
      }
      K.forEach((k, j) => {
        const n = 8;
        const [x1, y1] = at(k.from.t, k.from.x), [x2, y2] = at(k.from.t + k.g * n * k.tick, k.from.x + k.g * k.v * n * k.tick);
        out += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" class="pm-ink" stroke="${colour(j + 1)}" style="stroke-width:2.6"/>`;
        for (let q = 1; q <= n; q++) { const [tx, ty] = at(k.from.t + k.g * q * k.tick, k.from.x + k.g * k.v * q * k.tick); out += `<circle cx="${f1(tx)}" cy="${f1(ty)}" r="4" fill="var(--_card)" stroke="${colour(j + 1)}" stroke-width="2"/>`; }
        out += `<text x="${f1(x2 + 8)}" y="${f1(y2 + 10)}" class="pm-name" fill="${colour(j + 1)}" style="fill:${colour(j + 1)}">clock ${k.id}</text>`;
      });
      for (const e of P) {
        const [px, py] = at(e.t, e.x);
        out += `<circle cx="${f1(px)}" cy="${f1(py)}" r="6" class="pm-body" fill="var(--_2)"/><text x="${f1(px + 10)}" y="${f1(py - 8)}" class="pm-name">${e.id}</text>`;
      }
      out += `<text x="${WIDTH - 12}" y="22" class="pm-clock">${frame && Math.abs(w) > 1e-9 ? `${frame.id}: observer at ${num(w)}c` : 'rest frame S'}</text>`;
      out += `<text x="12" y="${H - 10}" class="pm-soft">→ distance (${xname}) · ↑ time (${tname}) · light at 45°</text>`;
      if (plot && sample) out += plot.svg + plot.cursor(w, [sample.dts[i], sample.dxs[i], sample.inv[i]]);
      return svgWrap(out, plot ? H + 150 : H, words(i), STYLE, options?.idPrefix ?? 'pm');
    }
  };
}
