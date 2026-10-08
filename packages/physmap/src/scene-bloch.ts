import type { Run, Scene } from './scene.ts';
import { NONE, list, suggest, val } from './core.ts';
import type { Ctx, Statement } from './core.ts';
import { WIDTH, arrow, f1, num, svgWrap } from './draw.ts';

/**
 * `scene bloch`: one qubit on the Bloch sphere. Every single-qubit gate is a rotation of the sphere about an axis,
 * so a gate is drawn as exactly that rotation. Steps with captions narrate a circuit; `measure` picks the axis whose
 * outcome probabilities are shown. One qubit only: pictures of several entangled qubits are not honest.
 */
const KEYWORDS = ['title', 'assume', 'param', 'predict', 'state', 'step', 'gate', 'measure'];
type N = number | { param: string };
type Vec3 = [number, number, number];

const KETS: Record<string, { v: Vec3; name: string }> = {
  '|0>': { v: [0, 0, 1], name: '|0⟩' }, '|1>': { v: [0, 0, -1], name: '|1⟩' },
  '|+>': { v: [1, 0, 0], name: '|+⟩' }, '|->': { v: [-1, 0, 0], name: '|−⟩' },
  '|i>': { v: [0, 1, 0], name: '|i⟩' }, '|-i>': { v: [0, -1, 0], name: '|−i⟩' }
};
const S2 = Math.SQRT1_2;
/** Rotation axis and angle (radians) for each named gate. The turn is about this axis of the sphere. */
const FIXED: Record<string, { axis: Vec3; angle: number }> = {
  X: { axis: [1, 0, 0], angle: Math.PI }, Y: { axis: [0, 1, 0], angle: Math.PI }, Z: { axis: [0, 0, 1], angle: Math.PI },
  H: { axis: [S2, 0, S2], angle: Math.PI },
  S: { axis: [0, 0, 1], angle: Math.PI / 2 }, Sdg: { axis: [0, 0, 1], angle: -Math.PI / 2 },
  T: { axis: [0, 0, 1], angle: Math.PI / 4 }, Tdg: { axis: [0, 0, 1], angle: -Math.PI / 4 }
};
const TURNS: Record<string, Vec3> = { Rx: [1, 0, 0], Ry: [0, 1, 0], Rz: [0, 0, 1] };
const GATES = [...Object.keys(FIXED), ...Object.keys(TURNS)];
const AXES: Record<string, { index: number; plus: string; minus: string }> = { z: { index: 2, plus: '|0⟩', minus: '|1⟩' }, x: { index: 0, plus: '|+⟩', minus: '|−⟩' }, y: { index: 1, plus: '|i⟩', minus: '|−i⟩' } };
const MAX_GATES = 40;
const PER_GATE = 14;

interface Action { line: number; kind: 'gate' | 'measure' | 'step'; gate?: string; angle?: N; axis?: string; step: number }

const STYLE = `
.pm .pm-sphere{fill:color-mix(in srgb,var(--_1) 6%,transparent);stroke:var(--_ink);stroke-width:1.8}
.pm .pm-circle{fill:none;stroke:var(--_muted);stroke-width:1.3}.pm .pm-back{stroke-dasharray:3 4;stroke-opacity:.6}
.pm .pm-axisline{stroke:var(--_ink);stroke-width:1.2;stroke-opacity:.5}
.pm .pm-trail2{fill:none;stroke:var(--_2);stroke-width:2.4;stroke-opacity:.55;stroke-linecap:round;stroke-linejoin:round}
.pm .pm-bar{fill:var(--_1)}.pm .pm-bar2{fill:var(--_4)}.pm .pm-track{fill:var(--_card);stroke:var(--_line)}
`;

export function parseBloch(ctx: Ctx, stmts: Statement[]): Scene | null {
  const { problem, args } = ctx;
  let start: { line: number; v?: Vec3; theta?: N; phi?: N } | undefined;
  const steps: string[] = [''];
  const actions: Action[] = [];
  let sawAction = false;

  for (const { line, command, rest } of stmts) {
    if (ctx.common({ line, command, rest })) continue;
    switch (command) {
      case 'state': {
        if (start) { problem(line, 'only one "state" line'); break; }
        if (sawAction) { problem(line, '"state" must come before any step or gate'); break; }
        const a = args(rest, ['theta', 'phi'], line, 'state');
        if (a.words[0]) {
          const ket = KETS[a.words[0]];
          if (!ket) { problem(line, `I don't know the state "${a.words[0]}".${suggest(a.words[0], Object.keys(KETS))} Known: ${list(Object.keys(KETS))}, or give theta=60deg phi=30deg`); break; }
          start = { line, v: ket.v };
        } else {
          if (!a.props.has('theta')) { problem(line, 'state needs a name like |0> or |+>, or theta=60deg phi=30deg'); break; }
          const theta = ctx.value(a.props.get('theta')?.text as string, NONE, 'theta', line, true);
          const phi = a.props.has('phi') ? ctx.value(a.props.get('phi')?.text as string, NONE, 'phi', line, true) : 0;
          if (theta !== null && phi !== null) start = { line, theta, phi };
        }
        break;
      }
      case 'step': {
        if (!rest[0]?.quoted) { problem(line, 'step needs a caption in quotes: step "Apply a Hadamard gate."'); break; }
        steps.push(rest[0].text);
        actions.push({ line, kind: 'step', step: steps.length - 1 });
        sawAction = true;
        break;
      }
      case 'gate': {
        const a = args(rest, ['angle'], line, 'gate');
        const g = a.words[0];
        if (!g || !GATES.includes(g)) { problem(line, `a gate is one of ${list(GATES)}.${g ? suggest(g, GATES) : ''} For example: gate H`); break; }
        const turn = g in TURNS;
        if (turn && !a.props.has('angle')) { problem(line, `${g} needs an angle: gate ${g} angle=90deg`); break; }
        if (!turn && a.props.has('angle')) { problem(line, `${g} turns by a fixed angle, so it takes no angle. Use Rx, Ry or Rz for a turn of your choice.`); break; }
        const angle = turn ? ctx.value(a.props.get('angle')?.text as string, NONE, 'angle', line, true) : undefined;
        if (angle === null) break;
        actions.push({ line, kind: 'gate', gate: g, angle, step: steps.length - 1 });
        sawAction = true;
        break;
      }
      case 'measure': {
        const axis = rest[0]?.text;
        if (!axis || !AXES[axis]) { problem(line, `measure needs an axis: ${list(Object.keys(AXES))}${axis ? `.${suggest(axis, Object.keys(AXES))}` : ''}`); break; }
        actions.push({ line, kind: 'measure', axis, step: steps.length - 1 });
        sawAction = true;
        break;
      }
      default:
        problem(line, `I don't know "${command}".${suggest(command, KEYWORDS)} Words I know: ${list(KEYWORDS)}`);
    }
  }
  if (actions.filter((a) => a.kind === 'gate').length > MAX_GATES) problem(1, `at most ${MAX_GATES} gates in one scene`);
  if (ctx.problems.length) return null;
  const gates = actions.filter((a) => a.kind === 'gate').length;
  return {
    kind: 'bloch', title: ctx.title, assumptions: ['one qubit, ideal gates (several qubits cannot be drawn this way)', ...ctx.assumptions], params: [...ctx.params.values()], predicts: ctx.predicts, images: [],
    playSeconds: Math.min(Math.max(gates * 1.4, 3), 24),
    run: (values) => blochRun(ctx.title, start ?? { line: 1, v: [0, 0, 1] }, steps, actions, values)
  };
}

interface Frame { v: Vec3; step: number; gate?: string; axis: string; gateIndex: number }

const rotate = (v: Vec3, k: Vec3, a: number): Vec3 => {
  const c = Math.cos(a), s = Math.sin(a);
  const dot = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const cross: Vec3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return [0, 1, 2].map((i) => v[i] * c + cross[i] * s + k[i] * dot * (1 - c)) as Vec3;
};
const norm = (v: Vec3): Vec3 => { const n = Math.hypot(...v) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };

function blochRun(title: string | undefined, start: { v?: Vec3; theta?: N; phi?: N }, steps: string[], actions: Action[], values: Record<string, number>): Run {
  let v: Vec3 = start.v ?? ((): Vec3 => { const t = val(start.theta as N, values), p = val(start.phi as N, values); return [Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t)]; })();
  v = norm(v);
  let axis = 'z';
  const frames: Frame[] = [{ v, step: 0, axis, gateIndex: 0 }];
  let gateIndex = 0;
  const gateCount = actions.filter((a) => a.kind === 'gate').length;
  for (const a of actions) {
    if (a.kind === 'step') {
      // the first step describes the starting picture, so it takes frame 0 instead of adding a copy
      if (frames.length === 1 && frames[0].step === 0) frames[0] = { ...frames[0], step: a.step };
      else frames.push({ v, step: a.step, axis, gateIndex });
      continue;
    }
    if (a.kind === 'measure') { axis = a.axis as string; frames[frames.length - 1] = { ...frames[frames.length - 1], axis }; continue; }
    gateIndex++;
    const fixed = FIXED[a.gate as string];
    const k = fixed ? fixed.axis : TURNS[a.gate as string];
    const total = fixed ? fixed.angle : val(a.angle as N, values);
    const label = fixed ? (a.gate as string) : `${a.gate}(${num((total * 180) / Math.PI)}°)`;
    for (let q = 1; q <= PER_GATE; q++) frames.push({ v: norm(rotate(v, k, (total * q) / PER_GATE)), step: a.step, gate: label, axis, gateIndex: q === PER_GATE ? gateIndex : gateIndex - 1 });
    v = frames[frames.length - 1].v;
  }
  const ok = frames.every((f) => f.v.every(Number.isFinite));
  const label = (u: Vec3) => {
    for (const k of Object.values(KETS)) if (Math.hypot(u[0] - k.v[0], u[1] - k.v[1], u[2] - k.v[2]) < 1e-3) return k.name;
    return '';
  };
  const ket = (u: Vec3) => {
    const theta = Math.acos(Math.min(1, Math.max(-1, u[2]))), phi = Math.atan2(u[1], u[0]);
    const a = Math.cos(theta / 2), b = Math.sin(theta / 2);
    if (b < 1e-6) return '|0⟩';
    if (a < 1e-6) return '|1⟩';
    const deg = (phi * 180) / Math.PI;
    return `${num(a)}|0⟩ + ${Math.abs(deg) < 1e-6 ? '' : `e^(${deg < 0 ? '−' : ''}i·${num(Math.abs(deg))}°)·`}${num(b)}|1⟩`;
  };
  const prob = (u: Vec3, ax: string) => { const p = (1 + u[AXES[ax].index]) / 2; return Math.min(1, Math.max(0, p)); };
  const words = (i: number) => {
    const f = frames[i];
    const p = prob(f.v, f.axis);
    const named = label(f.v);
    return `${[title, steps[f.step]].filter(Boolean).join('. ')}${steps[f.step] || title ? '. ' : ''}State ${named ? `${named} = ` : ''}${ket(f.v)}. Measuring along ${f.axis}: ${num(p * 100)}% ${AXES[f.axis].plus}, ${num((1 - p) * 100)}% ${AXES[f.axis].minus}.`;
  };

  const az = (-35 * Math.PI) / 180, el = (20 * Math.PI) / 180;
  const project = (u: Vec3) => {
    const x1 = u[0] * Math.cos(az) - u[1] * Math.sin(az), y1 = u[0] * Math.sin(az) + u[1] * Math.cos(az);
    return { sx: y1, sy: u[2] * Math.cos(el) - x1 * Math.sin(el), depth: x1 * Math.cos(el) + u[2] * Math.sin(el) };
  };
  const cx = 190, cy = 190, R = 135;
  const P = (u: Vec3) => { const q = project(u); return [cx + R * q.sx, cy - R * q.sy, q.depth] as const; };
  const circle = (fn: (t: number) => Vec3) => {
    let front = '', back = '';
    let lastFront = false;
    for (let k = 0; k <= 120; k++) {
      const [px, py, d] = P(fn((k / 120) * 2 * Math.PI));
      const isFront = d >= 0;
      if (isFront) { front += `${!lastFront || k === 0 ? 'M' : 'L'}${f1(px)} ${f1(py)}`; } else { back += `${lastFront || k === 0 ? 'M' : 'L'}${f1(px)} ${f1(py)}`; }
      lastFront = isFront;
    }
    return `<path d="${back}" class="pm-circle pm-back"/><path d="${front}" class="pm-circle"/>`;
  };

  return {
    count: frames.length, ok, problem: ok ? undefined : 'The angles are not valid numbers.',
    caption: (i) => [title, steps[frames[i].step]].filter(Boolean).join('. ') || '',
    clock: (i) => { const f = frames[i]; return steps.length > 1 ? `step ${f.step} of ${steps.length - 1}` : gateCount ? `gate ${f.gateIndex} of ${gateCount}` : ''; },
    describe: words,
    svg(i, options) {
      const f = frames[i];
      let out = '';
      const H = 390;
      out += `<circle cx="${cx}" cy="${cy}" r="${R}" class="pm-sphere"/>`;
      out += circle((t) => [Math.cos(t), Math.sin(t), 0]) + circle((t) => [Math.cos(t), 0, Math.sin(t)]) + circle((t) => [0, Math.cos(t), Math.sin(t)]);
      for (const [u, name] of [[[0, 0, 1], '|0⟩'], [[0, 0, -1], '|1⟩'], [[1, 0, 0], '|+⟩'], [[-1, 0, 0], '|−⟩'], [[0, 1, 0], '|i⟩'], [[0, -1, 0], '|−i⟩']] as [Vec3, string][]) {
        const [x1, y1] = P(u.map((n) => n * 1.18) as Vec3), [x0, y0] = P(u.map((n) => n * 1.0) as Vec3);
        out += `<line x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x1)}" y2="${f1(y1)}" class="pm-axisline"/><text x="${f1(x1)}" y="${f1(y1 + (u[2] < 0 ? 14 : u[2] > 0 ? -4 : 4))}" class="pm-mid pm-label">${name}</text>`;
      }
      // where the state has been
      const path = frames.slice(0, i + 1).map((q, k) => { const [px, py] = P(q.v); return `${k ? 'L' : 'M'}${f1(px)} ${f1(py)}`; }).join('');
      out += `<path d="${path}" class="pm-trail2"/>`;
      const [tx, ty] = P(f.v), [ox, oy] = [cx, cy];
      const [gx, gy] = P([f.v[0], f.v[1], 0]);
      out += `<line x1="${f1(tx)}" y1="${f1(ty)}" x2="${f1(gx)}" y2="${f1(gy)}" class="pm-thin" stroke-dasharray="3 4"/><circle cx="${f1(gx)}" cy="${f1(gy)}" r="3" fill="var(--_muted)"/>`;
      out += arrow(ox, oy, tx - ox, ty - oy, 'var(--_2)', 11, 6);
      out += `<circle cx="${f1(tx)}" cy="${f1(ty)}" r="6" class="pm-body" fill="var(--_2)"/>`;
      // the numbers on the right
      const p = prob(f.v, f.axis), ax = AXES[f.axis];
      const named = label(f.v);
      out += `<text x="420" y="40" class="pm-label">${f.gate ? `Gate ${f.gate}` : 'Start'}</text>`;
      out += `<text x="420" y="66" class="pm-soft">state</text><text x="420" y="86" class="pm-label">${named ? `${named} = ` : ''}${ket(f.v)}</text>`;
      out += `<text x="420" y="116" class="pm-soft">point on the sphere (x, y, z)</text><text x="420" y="136" class="pm-label">(${num(f.v[0])}, ${num(f.v[1])}, ${num(f.v[2])})</text>`;
      out += `<text x="420" y="178" class="pm-soft">if measured along ${f.axis}</text>`;
      const bar = (y: number, name: string, share: number, cls: string) => `<text x="420" y="${y + 13}" class="pm-label">${name}</text><rect x="480" y="${y}" width="200" height="18" rx="4" class="pm-track"/><rect x="480" y="${y}" width="${f1(200 * share)}" height="18" rx="4" class="${cls}"/><text x="${f1(480 + 200 * share + (share > 0.85 ? -6 : 6))}" y="${y + 13}" class="${share > 0.85 ? 'pm-end ' : ''}pm-label" style="${share > 0.85 ? 'fill:white' : ''}">${num(share * 100)}%</text>`;
      out += bar(190, ax.plus, p, 'pm-bar') + bar(216, ax.minus, 1 - p, 'pm-bar2');
      out += `<text x="${WIDTH - 12}" y="${H - 12}" class="pm-end pm-soft">${steps.length > 1 ? `step ${f.step} of ${steps.length - 1}` : ''}</text>`;
      return svgWrap(out, H, words(i), STYLE, options?.idPrefix ?? 'pm');
    }
  };
}
