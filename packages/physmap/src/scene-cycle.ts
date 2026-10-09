import type { Run, Scene, KindInfo } from './scene.ts';
import { NONE, list, suggest, val } from './core.ts';
import type { Ctx, Statement } from './core.ts';
import { dim } from './units.ts';
import { WIDTH, colour, f1, num, svgWrap } from './draw.ts';

/** What this kind is for and the words it understands: shown in the playground's field guide. */
export const INFO: KindInfo = {
  title: 'Heat and cycles',
  summary: 'An ideal gas taken through isothermal, isobaric, isochoric and adiabatic steps, on a pressure-volume diagram.',
  cannot: 'Real gases, phase changes, irreversible processes.',
  words: ['gas', 'process', 'note']
};

/**
 * `scene cycle`: an ideal gas taken through processes, drawn on a pressure-volume diagram.
 * The numbers come from pV = nRT and the first law (Q = ΔU + W), so every process is consistent by construction.
 * Isothermal, isobaric, isochoric and adiabatic processes are supported. A closed loop shows the work done per cycle
 * as an area and, when it is an engine, the efficiency.
 */
const R = 8.314462618;
const P = dim(-1, 1, -2);
const VOL = dim(3, 0, 0);
const TEMP = dim(0, 0, 0, 0, 1);
const KEYWORDS = ['title', 'assume', 'param', 'predict', 'gas', 'process', 'note'];
const KINDS = ['isothermal', 'isobaric', 'isochoric', 'adiabatic'];
type N = number | { param: string };

interface Start { line: number; moles: N; p?: N; v?: N; T?: N; gamma: N }
interface Step { line: number; kind: string; target: 'p' | 'v' | 'T'; value: N }

const STYLE = `
.pm .pm-fill{stroke:none;fill-opacity:.14}
.pm .pm-row{font:600 12.5px ui-monospace,monospace;fill:var(--_ink)}
`;

export function parseCycle(ctx: Ctx, stmts: Statement[]): Scene | null {
  const { problem, args } = ctx;
  let start: Start | undefined;
  const steps: Step[] = [];
  const notes: { line: number; at: number; text: string }[] = [];

  for (const { line, command, rest } of stmts) {
    if (ctx.common({ line, command, rest })) continue;
    switch (command) {
      case 'gas': {
        const a = args(rest, ['moles', 'p', 'v', 'T', 'gamma'], line, 'gas');
        if (start) { problem(line, 'only one gas'); break; }
        const moles = a.props.has('moles') ? ctx.value(a.props.get('moles')?.text as string, NONE, 'moles', line) : 1;
        const p = a.props.has('p') ? ctx.value(a.props.get('p')?.text as string, P, 'p', line) : undefined;
        const v = a.props.has('v') ? ctx.value(a.props.get('v')?.text as string, VOL, 'v', line) : undefined;
        const T = a.props.has('T') ? ctx.value(a.props.get('T')?.text as string, TEMP, 'T', line) : undefined;
        const gamma = a.props.has('gamma') ? ctx.value(a.props.get('gamma')?.text as string, NONE, 'gamma', line) : 1.4;
        const given = [p, v, T].filter((x) => x !== undefined).length;
        if (given !== 2) problem(line, 'give exactly two of p, v and T for the starting state (the third follows from pV = nRT): gas moles=1 p=100kPa T=300K');
        if (moles === null || p === null || v === null || T === null || gamma === null) break;
        if (typeof gamma === 'number' && (gamma <= 1 || gamma > 1.7)) problem(line, 'gamma is the ratio of heat capacities: 1.67 for a monatomic gas (helium), 1.4 for a diatomic gas (air), never above 1.67');
        start = { line, moles, p, v, T, gamma };
        break;
      }
      case 'process': {
        const kind = rest[0]?.text;
        if (!kind || !KINDS.includes(kind)) { problem(line, `a process is one of ${list(KINDS)}.${kind ? suggest(kind, KINDS) : ''} For example: process isobaric v=0.04m3`); break; }
        const a = args(rest.slice(1), ['p', 'v', 'T'], line, 'process');
        const keys = ['p', 'v', 'T'].filter((k) => a.props.has(k));
        if (keys.length !== 1) { problem(line, `${kind} needs exactly one target to reach: p=…, v=… or T=…`); break; }
        const k = keys[0] as 'p' | 'v' | 'T';
        if ((kind === 'isothermal' && k === 'T') || (kind === 'isobaric' && k === 'p') || (kind === 'isochoric' && k === 'v')) { problem(line, `${kind} keeps ${k === 'T' ? 'the temperature' : k === 'p' ? 'the pressure' : 'the volume'} fixed, so it cannot also have a target for it`); break; }
        const v = ctx.value(a.props.get(k)?.text as string, k === 'p' ? P : k === 'v' ? VOL : TEMP, k, line);
        if (v !== null) steps.push({ line, kind, target: k, value: v });
        break;
      }
      case 'note': {
        const at = Number(rest[0]?.text);
        if (!rest[1]?.quoted || !Number.isInteger(at)) problem(line, 'note needs the number of the process it comes with, and text in quotes: note 2 "Heat flows in."');
        else notes.push({ line, at, text: rest[1].text });
        break;
      }
      default:
        problem(line, `I don't know "${command}".${suggest(command, KEYWORDS)} Words I know: ${list(KEYWORDS)}`);
    }
  }
  if (!start && !ctx.problems.length) problem(1, 'start with the gas: gas moles=1 p=100kPa T=300K');
  if (!steps.length && !ctx.problems.length) problem(1, 'add at least one process: process isobaric v=0.04m3');
  if (steps.length > 8) problem(1, 'at most 8 processes in one scene');
  for (const n of notes) if (n.at < 1 || n.at > steps.length) problem(n.line, `there is no process number ${n.at}; there are ${steps.length}`);
  if (ctx.problems.length) return null;
  return {
    kind: 'cycle', title: ctx.title, assumptions: ['an ideal gas, every process slow enough to stay in equilibrium', ...ctx.assumptions], params: [...ctx.params.values()], predicts: ctx.predicts, images: [], playSeconds: 8,
    run: (values) => cycleRun(ctx.title, start as Start, steps, notes, values)
  };
}

interface State { p: number; v: number; T: number }
interface Leg { kind: string; from: State; to: State; pts: State[]; W: number; dU: number; Q: number }

const COUNT_PER_LEG = 60;

function cycleRun(title: string | undefined, start: Start, steps: Step[], notes: { at: number; text: string }[], values: Record<string, number>): Run {
  const n = val(start.moles, values), gamma = val(start.gamma, values);
  const cv = R / (gamma - 1);
  let p0 = start.p === undefined ? NaN : val(start.p, values), v0 = start.v === undefined ? NaN : val(start.v, values), T0 = start.T === undefined ? NaN : val(start.T, values);
  if (Number.isNaN(T0)) T0 = (p0 * v0) / (n * R); else if (Number.isNaN(p0)) p0 = (n * R * T0) / v0; else v0 = (n * R * T0) / p0;
  const first: State = { p: p0, v: v0, T: T0 };
  let ok = [n, gamma, p0, v0, T0].every((x) => Number.isFinite(x) && x > 0);
  let problemText = ok ? undefined : 'The starting state needs positive numbers.';
  const legs: Leg[] = [];
  let cur = first;
  for (const s of steps) {
    if (!ok) break;
    const target = val(s.value, values);
    let end: State;
    if (s.kind === 'isothermal') end = s.target === 'v' ? { p: (n * R * cur.T) / target, v: target, T: cur.T } : { p: target, v: (n * R * cur.T) / target, T: cur.T };
    else if (s.kind === 'isobaric') end = s.target === 'v' ? { p: cur.p, v: target, T: (cur.p * target) / (n * R) } : { p: cur.p, v: (n * R * target) / cur.p, T: target };
    else if (s.kind === 'isochoric') end = s.target === 'p' ? { p: target, v: cur.v, T: (target * cur.v) / (n * R) } : { p: (n * R * target) / cur.v, v: cur.v, T: target };
    else {
      // adiabatic: p v^γ is constant, T v^(γ−1) is constant
      if (s.target === 'v') { const p = cur.p * (cur.v / target) ** gamma; end = { p, v: target, T: (p * target) / (n * R) }; }
      else if (s.target === 'p') { const v = cur.v * (cur.p / target) ** (1 / gamma); end = { p: target, v, T: (target * v) / (n * R) }; }
      else { const v = cur.v * (cur.T / target) ** (1 / (gamma - 1)); end = { p: (n * R * target) / v, v, T: target }; }
    }
    if (![end.p, end.v, end.T].every((x) => Number.isFinite(x) && x > 0)) { ok = false; problemText = 'A process ends at a pressure, volume or temperature that is not above zero.'; break; }
    const pts: State[] = [];
    for (let k = 0; k <= COUNT_PER_LEG; k++) {
      const f = k / COUNT_PER_LEG;
      let v: number, p: number;
      if (s.kind === 'isochoric') { v = cur.v; p = cur.p + (end.p - cur.p) * f; }
      else if (s.kind === 'isobaric') { p = cur.p; v = cur.v + (end.v - cur.v) * f; }
      else { v = cur.v * (end.v / cur.v) ** f; p = s.kind === 'isothermal' ? (n * R * cur.T) / v : cur.p * (cur.v / v) ** gamma; }
      pts.push({ p, v, T: (p * v) / (n * R) });
    }
    const dU = n * cv * (end.T - cur.T);
    const W = s.kind === 'isochoric' ? 0 : s.kind === 'isobaric' ? cur.p * (end.v - cur.v) : s.kind === 'isothermal' ? n * R * cur.T * Math.log(end.v / cur.v) : -dU;
    legs.push({ kind: s.kind, from: cur, to: end, pts, W, dU, Q: dU + W });
    cur = end;
  }
  const closed = ok && legs.length > 1 && Math.abs(cur.p / first.p - 1) < 0.02 && Math.abs(cur.v / first.v - 1) < 0.02;
  const net = legs.reduce((a, l) => a + l.W, 0);
  const qIn = legs.reduce((a, l) => a + Math.max(l.Q, 0), 0);
  const eff = closed && net > 0 && qIn > 0 ? net / qIn : undefined;
  const all: { s: State; leg: number }[] = legs.flatMap((l, i) => l.pts.map((s) => ({ s, leg: i })));
  const count = Math.max(all.length, 1);
  const J = (x: number) => `${num(x)} J`;
  const lines = legs.map((l, i) => `${i + 1} ${l.kind.slice(0, 7)}. Q ${num(l.Q)}  W ${num(l.W)}`);
  const summary = closed ? `Closed loop: net work ${J(net)} per cycle${eff !== undefined ? `, efficiency ${num(eff * 100)}% (work out ÷ heat in)` : net < 0 ? ' (work is done on the gas: this is a refrigerator or heat pump cycle)' : ''}.` : legs.length ? `Net work ${J(net)}; heat in total ${J(legs.reduce((a, l) => a + l.Q, 0))}.` : '';
  const captionAt = (i: number) => {
    const leg = all[Math.min(i, all.length - 1)]?.leg ?? 0;
    const l = legs[leg];
    const note = notes.find((x) => x.at === leg + 1)?.text;
    return `${title ? `${title}. ` : ''}Process ${leg + 1}, ${l.kind}: heat in ${J(l.Q)}, work by the gas ${J(l.W)}, change in internal energy ${J(l.dU)}. ${note ?? ''} ${i >= count - 1 ? summary : ''}`.replace(/\s+/g, ' ').trim();
  };

  return {
    count, ok, problem: problemText,
    caption: ok ? captionAt : () => problemText ?? '',
    clock: (i) => { const s = all[Math.min(i, all.length - 1)]?.s; return s ? `${num(s.p / 1000)} kPa, ${num(s.v * 1000)} L, ${num(s.T)} K` : ''; },
    describe: (i) => captionAt(i),
    svg(i, options) {
      const H = 380;
      const ps = all.map((a) => a.s.p / 1000), vs = all.map((a) => a.s.v * 1000);
      const pMax = Math.max(...ps) * 1.12, pMin = Math.min(...ps) * 0.85, vMax = Math.max(...vs) * 1.08, vMin = Math.min(...vs) * 0.9;
      const left = 64, right = 450, top = 34, bottom = H - 44;
      const X = (v: number) => left + ((v - vMin) / (vMax - vMin)) * (right - left);
      const Y = (p: number) => bottom - ((p - pMin) / (pMax - pMin)) * (bottom - top);
      let out = `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" class="pm-axis"/>`;
      out += `<text x="${(left + right) / 2}" y="${H - 8}" class="pm-mid">volume (litres)</text><text x="14" y="${top - 12}">pressure (kPa)</text>`;
      out += `<text x="${left}" y="${bottom + 16}" class="pm-tick">${num(vMin)}</text><text x="${right}" y="${bottom + 16}" class="pm-tick pm-end">${num(vMax)}</text><text x="${left - 6}" y="${top + 4}" class="pm-tick pm-end">${num(pMax)}</text><text x="${left - 6}" y="${bottom}" class="pm-tick pm-end">${num(pMin)}</text>`;
      if (closed) out += `<path d="${all.map((a, k) => `${k ? 'L' : 'M'}${f1(X(a.s.v * 1000))} ${f1(Y(a.s.p / 1000))}`).join('')}Z" class="pm-fill" fill="var(--_${net > 0 ? 3 : 2})"/>`;
      legs.forEach((l, k) => {
        out += `<path d="${l.pts.map((s, j) => `${j ? 'L' : 'M'}${f1(X(s.v * 1000))} ${f1(Y(s.p / 1000))}`).join('')}" class="pm-series" stroke="${colour(k)}"/>`;
        const mid = l.pts[Math.floor(l.pts.length / 2)];
        out += `<text x="${f1(X(mid.v * 1000) + 6)}" y="${f1(Y(mid.p / 1000) - 6)}" class="pm-name" fill="${colour(k)}">${k + 1}</text>`;
      });
      for (const [k, s] of [first, ...legs.map((l) => l.to)].entries()) out += `<circle cx="${f1(X(s.v * 1000))}" cy="${f1(Y(s.p / 1000))}" r="4" fill="var(--_card)" stroke="var(--_ink)" stroke-width="2"/>${k === 0 ? `<text x="${f1(X(s.v * 1000) - 8)}" y="${f1(Y(s.p / 1000) - 8)}" class="pm-tick pm-end">start</text>` : ''}`;
      const here = all[Math.min(i, all.length - 1)];
      if (here) out += `<circle cx="${f1(X(here.s.v * 1000))}" cy="${f1(Y(here.s.p / 1000))}" r="7" class="pm-body" fill="var(--_4)"/>`;
      // the table of what each process did
      out += `<text x="470" y="48" class="pm-label">heat in (Q), work by the gas (W), in joules</text>`;
      lines.forEach((t, k) => { out += `<text x="470" y="${72 + k * 22}" class="pm-row" fill="${colour(k)}" style="fill:${colour(k)}">${t.replace(/ /g, ' ')}</text>`; });
      const y0 = 72 + lines.length * 22 + 12;
      if (summary) out += `<foreignObject x="470" y="${y0}" width="${WIDTH - 480}" height="120"><div xmlns="http://www.w3.org/1999/xhtml" style="font:600 13px sans-serif;color:var(--_ink);line-height:1.45">${summary}</div></foreignObject>`;
      return svgWrap(out, H, captionAt(i), STYLE, options?.idPrefix ?? 'pm');
    }
  };
}
