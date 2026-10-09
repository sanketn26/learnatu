import type { Run, Scene, KindInfo } from './scene.ts';
import { list, suggest, val } from './core.ts';
import type { Ctx, Statement } from './core.ts';
import { dim } from './units.ts';
import { f1, makePlot, num, siTime, svgWrap } from './draw.ts';

/** What this kind is for and the words it understands: shown in the playground's field guide. */
export const INFO: KindInfo = {
  title: 'Circuits',
  summary: 'A battery with resistors in series and parallel, and a capacitor charging through them.',
  cannot: 'Circuits with several loops, inductors, alternating current, real batteries.',
  words: ['battery', 'resistor', 'lamp', 'capacitor', 'parallel', 'end', 'run']
};

/**
 * `scene circuit`: one loop with a battery, resistors in series, groups of resistors in parallel, and at most one
 * capacitor in series. Without a capacitor the circuit is steady: voltages and currents are shown and the current is
 * drawn as moving dots. With a capacitor it charges through the resistance, and the voltage and current are plotted
 * over time. Built from Ohm's law, so the numbers always add up (the voltage drops add to the battery).
 */
const VOLT = dim(2, 1, -3, -1);
const OHM = dim(2, 1, -3, -2);
const FARAD = dim(-2, -1, 4, 2);
const T = dim(0, 0, 1);
const KEYWORDS = ['title', 'assume', 'param', 'predict', 'battery', 'resistor', 'lamp', 'capacitor', 'parallel', 'end', 'run'];
const ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
type N = number | { param: string };

interface Part { id: string; kind: 'resistor' | 'capacitor'; value: N; line: number }
type Item = Part | { group: Part[]; line: number };

const STYLE = `
.pm .pm-wire{fill:none;stroke:var(--_ink);stroke-width:2.4;stroke-linejoin:round}
.pm .pm-dot{fill:var(--_4)}
.pm .pm-part{fill:var(--_card);stroke:var(--_ink);stroke-width:2.2}
`;

export function parseCircuit(ctx: Ctx, stmts: Statement[]): Scene | null {
  const { problem } = ctx;
  let battery: { line: number; volts: N } | undefined;
  const items: Item[] = [];
  let group: Part[] | undefined;
  let groupLine = 0;
  let run: number | undefined;
  const ids = new Set<string>();

  for (const { line, command, rest } of stmts) {
    if (ctx.common({ line, command, rest })) continue;
    switch (command) {
      case 'battery': {
        if (battery) { problem(line, 'only one battery'); break; }
        const v = rest[0] ? ctx.value(rest[0].text, VOLT, 'battery', line) : (problem(line, 'battery needs a voltage: battery 9V'), null);
        if (v !== null) battery = { line, volts: v };
        break;
      }
      case 'resistor':
      case 'lamp':
      case 'capacitor': {
        const kind = command === 'capacitor' ? 'capacitor' : 'resistor';
        const [id, text] = [rest[0]?.text, rest[1]?.text];
        if (!id || !ID.test(id) || !text) { problem(line, `${command} needs a name and a value: ${command} ${kind === 'capacitor' ? 'C1 10uF' : 'R1 100ohm'}`); break; }
        if (ids.has(id)) { problem(line, `there is already a part called "${id}"`); break; }
        const v = ctx.value(text, kind === 'capacitor' ? FARAD : OHM, id, line);
        if (v === null) break;
        if (typeof v === 'number' && v <= 0) { problem(line, `${id} must be above zero`); break; }
        ids.add(id);
        const part: Part = { id, kind, value: v, line };
        if (group) { if (kind === 'capacitor') problem(line, 'a capacitor cannot go in a parallel group in this scene; put it in series'); else group.push(part); } else items.push(part);
        break;
      }
      case 'parallel':
        if (group) { problem(line, 'parallel groups cannot be nested'); break; }
        group = []; groupLine = line;
        break;
      case 'end':
        if (!group) { problem(line, '"end" closes a "parallel" group, but none is open'); break; }
        if (group.length < 2) problem(groupLine, 'a parallel group needs at least two resistors');
        else items.push({ group, line: groupLine });
        group = undefined;
        break;
      case 'run': {
        const t = rest[0] ? ctx.fixed(rest[0].text, T, 'run', line) : (problem(line, 'run needs a time: run 5ms'), null);
        if (t !== null) run = t;
        break;
      }
      default:
        problem(line, `I don't know "${command}".${suggest(command, KEYWORDS)} Words I know: ${list(KEYWORDS)}`);
    }
  }
  if (group) problem(groupLine, 'this "parallel" group is never closed with "end"');
  if (!battery && !ctx.problems.length) problem(1, 'add a battery: battery 9V');
  if (!items.length && !ctx.problems.length) problem(1, 'add a resistor: resistor R1 100ohm');
  const caps = items.filter((i): i is Part => 'kind' in i && i.kind === 'capacitor');
  if (caps.length > 1) problem(caps[1].line, 'at most one capacitor');
  if (run !== undefined && !caps.length) problem(1, 'run only makes sense with a capacitor, which is what changes with time');
  if (ctx.problems.length) return null;
  return {
    kind: 'circuit', title: ctx.title, assumptions: ['ideal wires and battery (no internal resistance)', ...ctx.assumptions], params: [...ctx.params.values()], predicts: ctx.predicts, images: [],
    playSeconds: caps.length ? 6 : 4,
    run: (values) => circuitRun(ctx.title, battery as NonNullable<typeof battery>, items, run, values)
  };
}

const FRAMES = 60;

function circuitRun(title: string | undefined, battery: { volts: N }, items: Item[], runTime: number | undefined, values: Record<string, number>): Run {
  const V = val(battery.volts, values);
  const stage = items.map((item) => 'group' in item
    ? { group: item.group.map((p) => ({ id: p.id, r: val(p.value, values) })), kind: 'group' as const }
    : { part: { id: item.id, v: val(item.value, values) }, kind: item.kind });
  const cap = stage.find((s) => s.kind === 'capacitor');
  const groupR = (g: { r: number }[]) => 1 / g.reduce((a, b) => a + 1 / b.r, 0);
  const R = stage.reduce((a, s) => a + (s.kind === 'resistor' ? (s.part as { v: number }).v : s.kind === 'group' ? groupR(s.group as { r: number }[]) : 0), 0);
  const C = cap ? (cap.part as { v: number }).v : 0;
  const tau = R * C;
  const ok = [V, R, C].every(Number.isFinite) && V > 0 && R > 0;
  const duration = cap ? (runTime ?? 5 * tau) : 0;
  const count = cap ? 121 : FRAMES;
  const times = cap ? Array.from({ length: count }, (_, i) => (i / (count - 1)) * duration) : [];
  // the current through the loop, and what that means for each part, at moment i
  const at = (i: number) => {
    const t = cap ? times[i] : 0;
    const I = cap ? (V / R) * Math.exp(-t / tau) : V / R;
    const vc = cap ? V * (1 - Math.exp(-t / tau)) : 0;
    return { t, I, vc };
  };
  const maxBranchesAll = Math.max(1, ...stage.map((s) => (s.kind === 'group' ? (s.group as unknown[]).length : 1)));
  const sceneH = 90 + 80 + (maxBranchesAll - 1) * 44 + 60;
  const iPlot = cap && ok ? makePlot({ top: sceneH, height: 120, unit: 'A', yFrom: 0, yTo: (V / R) * 1.05, xFrom: 0, xTo: duration, xFromLabel: '0 s', xToLabel: siTime(duration), series: [{ name: 'current', xs: times, ys: times.map((_, i) => at(i).I) }] }) : undefined;
  const vPlot = cap && ok ? makePlot({ top: sceneH + 120, height: 120, unit: 'V', xFrom: 0, xTo: duration, xFromLabel: '0 s', xToLabel: siTime(duration), yFrom: 0, yTo: V * 1.05, series: [{ name: 'voltage across the capacitor', xs: times, ys: times.map((_, i) => at(i).vc) }] }) : undefined;

  const words = (i: number) => {
    const { t, I, vc } = at(i);
    if (cap) return `${title ? `${title}. ` : ''}After ${siTime(t)} the capacitor holds ${num(vc)} V of the ${num(V)} V and the current is ${num(I)} A. The time constant RC is ${siTime(tau)}; after about five of them it is fully charged.`;
    return `${title ? `${title}. ` : ''}Total resistance ${num(R)} Ω, so the battery drives ${num(I)} A. The voltage drops add up to ${num(V)} V.`;
  };

  return {
    count, ok, problem: ok ? undefined : 'The battery and resistances must be above zero.',
    caption: words, clock: (i) => (cap ? `${siTime(times[i])} / ${siTime(duration)}` : ''),
    describe: words,
    svg(i, options) {
      const { I, vc } = at(i);
      const phase = cap ? 0 : i / FRAMES;
      const left = 80, right = 640, top = 90;
      const maxBranches = Math.max(1, ...stage.map((s) => (s.kind === 'group' ? (s.group as unknown[]).length : 1)));
      const bottom = top + 80 + (maxBranches - 1) * 44;
      const heightScene = bottom + 60;
      const slot = (right - left - 40) / stage.length;
      let out = '';
      const dots = (x1: number, y1: number, x2: number, y2: number, current: number) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len < 4 || current <= 1e-12) return '';
        const gap = 22;
        const move = (phase * 3 * gap * Math.min(1, current / Math.max(I, 1e-12))) % gap;
        let d = '';
        for (let s = move; s < len; s += gap) d += `<circle cx="${f1(x1 + ((x2 - x1) * s) / len)}" cy="${f1(y1 + ((y2 - y1) * s) / len)}" r="3.2" class="pm-dot"/>`;
        return d;
      };
      // the battery on the left wire, wire along the top through the parts, down the right, back along the bottom
      out += `<path d="M${left} ${top + 28}V${top}H${right}V${bottom}H${left}V${top + 52}" class="pm-wire"/>`;
      out += `<line x1="${left - 14}" x2="${left + 14}" y1="${top + 28}" y2="${top + 28}" class="pm-wire"/><line x1="${left - 7}" x2="${left + 7}" y1="${top + 40}" y2="${top + 40}" class="pm-wire" style="stroke-width:5"/>`;
      out += `<text x="${left - 22}" y="${top + 38}" class="pm-end pm-label">${num(V)} V</text><text x="${left + 20}" y="${top + 31}" class="pm-soft">+</text>`;
      let sumDrops = 0;
      stage.forEach((s, k) => {
        const x0 = left + 20 + k * slot, x1 = x0 + slot - 20, mid = (x0 + x1) / 2;
        if (s.kind === 'group') {
          const g = s.group as { id: string; r: number }[];
          const Rg = groupR(g);
          const vg = cap ? I * Rg : I * Rg;
          sumDrops += vg;
          out += `<path d="M${f1(x0)} ${top}V${top + (g.length - 1) * 44}M${f1(x1)} ${top}V${top + (g.length - 1) * 44}" class="pm-wire"/>`;
          g.forEach((p, j) => {
            const y = top + j * 44, ib = vg / p.r;
            out += `<rect x="${f1(mid - 28)}" y="${y - 10}" width="56" height="20" rx="3" class="pm-part"/>`;
            out += `<text x="${f1(mid)}" y="${y + 4}" class="pm-mid pm-label">${p.id}</text><text x="${f1(mid)}" y="${y + 26}" class="pm-mid pm-soft">${num(p.r)} Ω · ${num(ib)} A</text>`;
            out += dots(x0, y, mid - 28, y, ib) + dots(mid + 28, y, x1, y, ib);
          });
          out += `<text x="${f1(mid)}" y="${top - 22}" class="pm-mid pm-soft">${num(vg)} V across the pair</text>`;
        } else if (s.kind === 'resistor') {
          const p = s.part as { id: string; v: number };
          const vr = I * p.v;
          sumDrops += vr;
          out += `<rect x="${f1(mid - 30)}" y="${top - 11}" width="60" height="22" rx="3" class="pm-part"/><text x="${f1(mid)}" y="${top + 4}" class="pm-mid pm-label">${p.id}</text>`;
          out += `<text x="${f1(mid)}" y="${top - 22}" class="pm-mid pm-soft">${num(p.v)} Ω · ${num(vr)} V</text>`;
          out += dots(x0, top, mid - 30, top, I) + dots(mid + 30, top, x1, top, I);
        } else {
          const p = s.part as { id: string; v: number };
          sumDrops += vc;
          out += `<line x1="${f1(mid - 5)}" x2="${f1(mid - 5)}" y1="${top - 16}" y2="${top + 16}" class="pm-wire" style="stroke-width:4"/><line x1="${f1(mid + 5)}" x2="${f1(mid + 5)}" y1="${top - 16}" y2="${top + 16}" class="pm-wire" style="stroke-width:4"/>`;
          out += `<text x="${f1(mid)}" y="${top - 26}" class="pm-mid pm-soft">${p.id} ${num(p.v * 1e6)} µF · ${num(vc)} V</text>`;
          out += `<rect x="${f1(mid - 5 - 12)}" y="${f1(top + 16 - 32 * (vc / V))}" width="10" height="${f1(32 * (vc / V))}" fill="var(--_1)" fill-opacity=".5"/>`;
          out += dots(x0, top, mid - 5, top, I) + dots(mid + 5, top, x1, top, I);
        }
      });
      out += dots(right, top, right, bottom, I) + dots(right, bottom, left, bottom, I) + dots(left, bottom, left, top + 52, I);
      out += `<text x="${(left + right) / 2}" y="${bottom + 24}" class="pm-mid pm-label">current ${num(I)} A · drops add up to ${num(sumDrops)} V of ${num(V)} V</text>`;
      if (iPlot && vPlot) {
        out += iPlot.svg + iPlot.cursor(times[i], [I]) + vPlot.svg + vPlot.cursor(times[i], [vc]);
      }
      return svgWrap(out, cap ? sceneH + 240 : heightScene, words(i), STYLE, options?.idPrefix ?? 'pm');
    }
  };
}
