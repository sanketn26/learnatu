import { PhysSyntaxError } from './types.ts';
import type { Body, Dim, Endpoint, Link, Model, Param, Plot, Problem, Series, Val, Vec } from './types.ts';
import { tokenize } from './tokenize.ts';
import type { Token } from './tokenize.ts';
import { NO_DIM, dimName, dimSymbol, isNone, parseQuantity, sameDim } from './units.ts';
import { PLANETS, shortestSpring, simulate } from './sim.ts';

/**
 * Reads the text of a ```phys block into a Model. See the README for the language.
 * `parsePhys` never throws: it returns the model (when there are no mistakes) and every problem it found.
 * `parse` throws a PhysSyntaxError instead. `check` returns just the problems.
 */
export interface ParseResult { model: Model | null; problems: Problem[] }
export interface CheckOptions { /** Say whether an image the text names exists in the course. When left out, image names are not checked. */ hasImage?: (ref: string) => boolean }

const ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
const L: Dim = { L: 1, M: 0, T: 0 };
const M: Dim = { L: 0, M: 1, T: 0 };
const T: Dim = { L: 0, M: 0, T: 1 };
const SPEED: Dim = { L: 1, M: 0, T: -1 };
const ACCEL: Dim = { L: 1, M: 0, T: -2 };
const STIFF: Dim = { L: 0, M: 1, T: -2 };
const DRAG: Dim = { L: 0, M: 1, T: -1 };
const ENERGY: Dim = { L: 2, M: 1, T: -2 };

const SCENES = ['mechanics'];
const PLANNED = ['wave', 'ray', 'field', 'cycle', 'circuit', 'spacetime', 'bloch'];
const KEYWORDS = ['scene', 'title', 'assume', 'param', 'body', 'gravity', 'spring', 'rod', 'drag', 'ground', 'run', 'plot', 'show', 'trail', 'note', 'predict', 'backdrop'];
/** body: whether the quantity belongs to a body (yes), to the whole scene (no), or can be either (kinetic energy). */
const QUANTITIES: Record<string, { dim: Dim; body: 'yes' | 'no' | 'either' }> = {
  x: { dim: L, body: 'yes' }, y: { dim: L, body: 'yes' }, vx: { dim: SPEED, body: 'yes' }, vy: { dim: SPEED, body: 'yes' },
  speed: { dim: SPEED, body: 'yes' }, ke: { dim: ENERGY, body: 'either' }, pe: { dim: ENERGY, body: 'no' }, energy: { dim: ENERGY, body: 'no' }
};
const MAX_RUN = 3600;

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = keep;
    }
  }
  return row[b.length];
}

/** ` Did you mean "mass"?` when one of `choices` is close to `word`. */
function suggest(word: string, choices: string[]): string {
  let best = '';
  let bestDistance = 3;
  for (const choice of choices) {
    const d = distance(word.toLowerCase(), choice.toLowerCase());
    if (d < bestDistance) { best = choice; bestDistance = d; }
  }
  return best ? ` Did you mean "${best}"?` : '';
}
const list = (items: readonly string[]) => items.map((i) => `"${i}"`).join(', ');

/** Spaces inside (...) are dropped, so "(0m, 1m)" is one word. Quoted text is left alone. */
function tightenParens(line: string): string {
  let out = '';
  let depth = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && quoted) { out += c + (line[++i] ?? ''); continue; }
    if (c === '"') quoted = !quoted;
    if (!quoted && c === '(') depth++;
    if (!quoted && c === ')') depth = Math.max(0, depth - 1);
    if (depth > 0 && !quoted && (c === ' ' || c === '\t')) continue;
    out += c;
  }
  return out;
}

interface Args { words: string[]; props: Map<string, { text: string }> }

export function parsePhys(source: string): ParseResult {
  const problems: Problem[] = [];
  const problem = (line: number, message: string) => { problems.push({ line, message }); };
  const m: Model = {
    scene: 'mechanics', assumptions: [], params: [], bodies: [], links: [], drags: [], gravity: 0, run: 0,
    plots: [], showVelocity: [], showForce: [], trails: [], notes: [], predicts: [], images: []
  };
  const params = new Map<string, Param>();
  const deferred: (() => void)[] = [];
  let sawScene = false;
  let sawRun = false;
  let allVelocity = false, allForce = false, allTrails = false;

  /** A number with a unit in `dim`, or `$slider`. Records a problem and returns null when it is not. */
  const value = (text: string, dim: Dim, what: string, line: number, needUnit = false): Val | null => {
    if (text.startsWith('$')) {
      const p = params.get(text.slice(1));
      if (!p) { problem(line, `there is no slider called "${text.slice(1)}"; add a "param" line for it first.${suggest(text.slice(1), [...params.keys()])}`); return null; }
      if (!sameDim(p.dim, dim)) { problem(line, `${what} needs ${dimName(dim)}, but the slider "${p.name}" is ${dimName(p.dim)} (${p.unit || 'no unit'})`); return null; }
      return { param: p.name };
    }
    const q = parseQuantity(text);
    if (typeof q === 'string') { problem(line, `${what}: ${q}`); return null; }
    if (!sameDim(q.dim, dim)) {
      if (isNone(q.dim)) problem(line, `${what} needs ${dimName(dim)}, so write a unit, for example ${text}${dimSymbol(dim)}`);
      else problem(line, `${what} needs ${dimName(dim)}, but "${text}" is ${dimName(q.dim)}`);
      return null;
    }
    if (needUnit && !q.unit) { problem(line, `${what} needs a unit: deg or rad (for example ${text}deg)`); return null; }
    return q.value;
  };

  const vector = (text: string, dim: Dim, what: string, line: number): Vec | null => {
    const match = /^\((.*)\)$/.exec(text);
    const parts = match ? match[1].split(',') : [];
    if (parts.length !== 2) { problem(line, `${what} needs two numbers in brackets, like (2m,1m); you wrote "${text}"`); return null; }
    const x = value(parts[0].trim(), dim, `${what} (first number)`, line);
    const y = value(parts[1].trim(), dim, `${what} (second number)`, line);
    return x === null || y === null ? null : [x, y];
  };

  const args = (tokens: Token[], keys: string[], line: number, command: string): Args => {
    const out: Args = { words: [], props: new Map() };
    for (const t of tokens) {
      let key = t.key;
      let text = t.text;
      if (!key && !t.quoted) {
        const eq = t.text.indexOf('=');
        if (eq > 0 && /^[A-Za-z_]\w*$/.test(t.text.slice(0, eq))) { key = t.text.slice(0, eq); text = t.text.slice(eq + 1); }
      }
      if (key === undefined) { out.words.push(t.text); continue; }
      if (!keys.includes(key)) { problem(line, `"${command}" has no property "${key}".${suggest(key, keys)} It can have: ${list(keys)}`); continue; }
      if (out.props.has(key)) { problem(line, `"${key}" is written twice`); continue; }
      out.props.set(key, { text });
    }
    return out;
  };

  const lines = source.split('\n');
  lines.forEach((raw, i) => {
    const line = i + 1;
    const { tokens, error } = tokenize(tightenParens(raw));
    if (error) { problem(line, error); return; }
    if (!tokens.length) return;
    const command = tokens[0].text;
    const rest = tokens.slice(1);

    if (!sawScene && command !== 'scene') {
      problem(line, 'start the block with the kind of scene, for example: scene mechanics');
      sawScene = true;
    }

    switch (command) {
      case 'scene': {
        if (sawScene) { problem(line, 'only one "scene" line, and it comes first'); break; }
        sawScene = true;
        const kind = rest[0]?.text;
        if (!kind) problem(line, `say which scene: scene ${SCENES[0]}`);
        else if (PLANNED.includes(kind)) problem(line, `the "${kind}" scene is planned but not available yet. Available now: ${list(SCENES)}`);
        else if (!SCENES.includes(kind)) problem(line, `I don't know a "${kind}" scene.${suggest(kind, [...SCENES, ...PLANNED])} Available now: ${list(SCENES)}`);
        break;
      }
      case 'title': {
        if (!rest[0]?.quoted) problem(line, 'title needs the text in quotes: title "Mass on a spring"');
        else m.title = rest[0].text;
        break;
      }
      case 'assume': {
        if (!rest[0]?.quoted) problem(line, 'assume needs the text in quotes: assume "no air resistance"');
        else m.assumptions.push(rest[0].text);
        break;
      }
      case 'param': {
        const a = args(rest, ['start', 'label'], line, 'param');
        const [name, span, unitText = ''] = a.words;
        if (!name || !ID.test(name)) { problem(line, 'param needs a name: param k 10..100 N/m start=40'); break; }
        if (params.has(name)) { problem(line, `the slider "${name}" is already defined`); break; }
        const range = span ? /^(.+?)\.\.(.+)$/.exec(span) : null;
        const lo = range ? Number(range[1]) : NaN;
        const hi = range ? Number(range[2]) : NaN;
        if (!range || !Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) { problem(line, `param "${name}" needs a range from smaller to bigger, like 10..100`); break; }
        const unit = parseQuantity(`1${unitText}`);
        if (typeof unit === 'string') { problem(line, `param "${name}": ${unit}`); break; }
        const start = a.props.has('start') ? Number(a.props.get('start')?.text) : lo;
        if (!Number.isFinite(start) || start < lo || start > hi) { problem(line, `start for "${name}" must be a number from ${lo} to ${hi}`); break; }
        const p: Param = { name, line, min: lo * unit.value, max: hi * unit.value, start: start * unit.value, dim: unit.dim, unit: unitText, factor: unit.value, label: a.props.get('label')?.text ?? name };
        params.set(name, p);
        m.params.push(p);
        break;
      }
      case 'body': {
        const a = args(rest, ['mass', 'at', 'v', 'speed', 'angle', 'radius', 'sprite'], line, 'body');
        const id = a.words[0];
        if (!id || !ID.test(id)) { problem(line, 'body needs a name: body ball mass=1kg at=(0m,2m)'); break; }
        if (m.bodies.some((b) => b.id === id)) { problem(line, `there is already a body called "${id}"`); break; }
        if (a.words.length > 1) problem(line, `unexpected "${a.words[1]}": write properties as name=value, like mass=2kg`);
        for (const need of ['mass', 'at']) if (!a.props.has(need)) problem(line, `body "${id}" needs ${need}=${need === 'mass' ? '…kg' : '(x,y)'}`);
        if (a.props.has('v') && (a.props.has('speed') || a.props.has('angle'))) problem(line, 'give either v=(…) or speed= and angle=, not both');
        if (a.props.has('speed') !== a.props.has('angle')) problem(line, 'speed and angle go together: speed=20m/s angle=30deg');
        const get = (k: string) => a.props.get(k)?.text;
        const mass = get('mass') ? value(get('mass') as string, M, 'mass', line) : null;
        const at = get('at') ? vector(get('at') as string, L, 'at', line) : null;
        const v = get('v') ? vector(get('v') as string, SPEED, 'v', line) : ([0, 0] as Vec);
        const speed = get('speed') ? value(get('speed') as string, SPEED, 'speed', line) : null;
        const angle = get('angle') ? value(get('angle') as string, NO_DIM, 'angle', line, true) : null;
        const radius = get('radius') ? value(get('radius') as string, L, 'radius', line) : 0;
        if (typeof radius === 'object' && radius !== null) problem(line, 'radius cannot be a slider');
        if (mass === null || at === null || v === null) break;
        const body: Body = { id, line, mass, at, v, radius: typeof radius === 'number' ? radius : 0 };
        if (speed !== null && angle !== null) body.launch = { speed, angle };
        if (get('sprite')) { body.sprite = get('sprite'); m.images.push({ line, ref: body.sprite as string }); }
        m.bodies.push(body);
        break;
      }
      case 'gravity': {
        const text = rest[0]?.text;
        if (!text) { problem(line, 'gravity needs a value: gravity earth, or gravity 9.8m/s2'); break; }
        if (PLANETS[text] !== undefined) { m.gravity = PLANETS[text]; break; }
        const g = value(text, ACCEL, 'gravity', line);
        if (g !== null) m.gravity = g;
        break;
      }
      case 'spring':
      case 'rod': {
        const kind = command;
        const a = args(rest, kind === 'spring' ? ['k', 'from', 'to', 'rest'] : ['from', 'to'], line, kind);
        if (a.words.length) problem(line, `unexpected "${a.words[0]}": write properties as name=value, like from=(0m,1m)`);
        for (const need of kind === 'spring' ? ['k', 'from', 'to', 'rest'] : ['from', 'to']) if (!a.props.has(need)) problem(line, `${kind} needs ${need}=…`);
        const get = (k: string) => a.props.get(k)?.text;
        const end = (k: string): Endpoint | null => {
          const text = get(k);
          if (!text) return null;
          if (text.startsWith('(')) { const p = vector(text, L, k, line); return p ? { point: p } : null; }
          return { body: text };
        };
        const from = end('from');
        const to = end('to');
        const k = kind === 'spring' && get('k') ? value(get('k') as string, STIFF, 'k', line) : 0;
        const rest_ = kind === 'spring' && get('rest') ? value(get('rest') as string, L, 'rest', line) : undefined;
        if (!from || !to || k === null || rest_ === null) break;
        if (!('body' in from) && !('body' in to)) { problem(line, `${kind} needs at least one end on a body`); break; }
        const link: Link = { line, kind, k, from, to };
        if (rest_ !== undefined) link.rest = rest_;
        m.links.push(link);
        break;
      }
      case 'drag': {
        const a = args(rest, ['c'], line, 'drag');
        if (!a.words[0] || !a.props.has('c')) { problem(line, 'drag needs a body and a strength: drag ball c=0.2kg/s'); break; }
        const c = value(a.props.get('c')?.text as string, DRAG, 'c', line);
        if (c !== null) m.drags.push({ body: a.words[0], c });
        break;
      }
      case 'ground': {
        const a = args(rest, ['y', 'bounce'], line, 'ground');
        if (a.words.length) problem(line, `unexpected "${a.words[0]}": write ground y=0m bounce=0.7`);
        if (m.ground) { problem(line, 'only one ground'); break; }
        const y = a.props.has('y') ? value(a.props.get('y')?.text as string, L, 'y', line) : 0;
        const bounce = a.props.has('bounce') ? value(a.props.get('bounce')?.text as string, NO_DIM, 'bounce', line) : 0;
        if (typeof bounce === 'number' && (bounce < 0 || bounce > 1)) { problem(line, 'bounce is a number from 0 (no bounce) to 1 (perfect bounce)'); break; }
        if (y !== null && bounce !== null) m.ground = { y, bounce };
        break;
      }
      case 'run': {
        if (sawRun) { problem(line, 'only one "run" line'); break; }
        sawRun = true;
        const t = rest[0] ? value(rest[0].text, T, 'run', line) : (problem(line, 'run needs a time: run 10s'), null);
        if (typeof t === 'object' && t !== null) problem(line, 'run cannot be a slider');
        else if (t !== null) {
          if (t <= 0 || t > MAX_RUN) problem(line, `run must be longer than 0 and at most ${MAX_RUN} s`);
          else m.run = t;
        }
        break;
      }
      case 'plot': {
        if (!rest.length) { problem(line, 'plot needs something to draw: plot ball.y, or plot energy'); break; }
        const series: Series[] = [];
        for (const t of rest) {
          const [first, second] = t.text.split('.');
          const q = second ?? first;
          const body = second === undefined ? undefined : first;
          if (!QUANTITIES[q]) { problem(line, `I can't plot "${t.text}".${suggest(q, Object.keys(QUANTITIES))} Quantities: ${list(Object.keys(QUANTITIES))}`); continue; }
          if (QUANTITIES[q].body === 'yes' && !body) { problem(line, `"${q}" belongs to a body: write ball.${q}`); continue; }
          if (QUANTITIES[q].body === 'no' && body) { problem(line, `"${q}" is for the whole scene: write just ${q}`); continue; }
          series.push({ body, q: q as Series['q'] });
        }
        if (!series.length) break;
        const dim = QUANTITIES[series[0].q].dim;
        if (series.some((s) => !sameDim(QUANTITIES[s.q].dim, dim))) { problem(line, `these measure different things, so they can't share one graph: put ${dimName(dim)} and the others on separate plot lines`); break; }
        m.plots.push({ line, series } as Plot);
        break;
      }
      case 'show': {
        const what = rest[0]?.text;
        if (what !== 'velocity' && what !== 'force') { problem(line, `show needs "velocity" or "force", then optionally body names${what ? suggest(what, ['velocity', 'force']) : ''}`); break; }
        const ids = rest.slice(1).map((t) => t.text);
        if (what === 'velocity') { if (ids.length) m.showVelocity.push(...ids); else allVelocity = true; } else if (ids.length) m.showForce.push(...ids); else allForce = true;
        deferred.push(() => ids.forEach((id) => { if (!m.bodies.some((b) => b.id === id)) problem(line, `there is no body called "${id}".${suggest(id, m.bodies.map((b) => b.id))}`); }));
        break;
      }
      case 'trail': {
        const ids = rest.map((t) => t.text);
        if (ids.length) m.trails.push(...ids); else allTrails = true;
        deferred.push(() => ids.forEach((id) => { if (!m.bodies.some((b) => b.id === id)) problem(line, `there is no body called "${id}".${suggest(id, m.bodies.map((b) => b.id))}`); }));
        break;
      }
      case 'note': {
        const t = rest[0] ? value(rest[0].text, T, 'note time', line) : null;
        if (!rest[0]) problem(line, 'note needs a time and text: note 2s "The spring is longest."');
        else if (!rest[1]?.quoted) problem(line, 'note needs the text in quotes: note 2s "The spring is longest."');
        else if (typeof t === 'number') m.notes.push({ line, t, text: rest[1].text });
        else if (t !== null) problem(line, 'a note time cannot be a slider');
        break;
      }
      case 'predict': {
        const a = args(rest, ['answer'], line, 'predict');
        if (!a.words[0] || !rest.find((t) => t.quoted && !t.key)) { problem(line, 'predict needs a question in quotes and answer="…": predict "What happens if the mass doubles?" answer="The period grows by about 41%."'); break; }
        const answer = a.props.get('answer')?.text;
        if (!answer) { problem(line, 'predict needs answer="…"'); break; }
        m.predicts.push({ line, question: a.words[0], answer });
        break;
      }
      case 'backdrop': {
        const a = args(rest, ['from', 'size'], line, 'backdrop');
        const ref = a.words[0];
        if (!ref || !a.props.has('from') || !a.props.has('size')) { problem(line, 'backdrop needs a picture and where it sits: backdrop "ramp.png" from=(0m,0m) size=(4m,2m)'); break; }
        const from = vector(a.props.get('from')?.text as string, L, 'from', line);
        const size = vector(a.props.get('size')?.text as string, L, 'size', line);
        if (!from || !size) break;
        if (typeof size[0] !== 'number' || typeof size[1] !== 'number' || size[0] <= 0 || size[1] <= 0) { problem(line, 'size must be two positive lengths (not sliders)'); break; }
        if (m.backdrop) { problem(line, 'only one backdrop'); break; }
        m.backdrop = { ref, from, size: [size[0], size[1]] };
        m.images.push({ line, ref });
        break;
      }
      default:
        problem(line, `I don't know "${command}".${suggest(command, KEYWORDS)} Words I know: ${list(KEYWORDS)}`);
    }
  });

  if (!sawScene) problem(1, 'start the block with the kind of scene, for example: scene mechanics');
  const ids = m.bodies.map((b) => b.id);
  if (!m.bodies.length && !problems.length) problem(1, 'add at least one body: body ball mass=1kg at=(0m,1m)');
  if (!sawRun && !problems.length) problem(1, 'say how long to run: run 10s');
  for (const l of m.links) {
    for (const e of [l.from, l.to]) if ('body' in e && !ids.includes(e.body)) problem(l.line, `there is no body called "${e.body}".${suggest(e.body, ids)}`);
    if (l.kind === 'rod' && !(('body' in l.from) !== ('body' in l.to))) problem(l.line, 'a rod joins a body to a fixed point: rod from=(0m,2m) to=ball');
  }
  for (const dr of m.drags) if (!ids.includes(dr.body)) problem(m.bodies[0]?.line ?? 1, `drag: there is no body called "${dr.body}".${suggest(dr.body, ids)}`);
  for (const p of m.plots) for (const s of p.series) if (s.body && !ids.includes(s.body)) problem(p.line, `there is no body called "${s.body}".${suggest(s.body, ids)}`);
  for (const n of m.notes) if (m.run && n.t > m.run) problem(n.line, `this note is at ${n.t} s but the run only lasts ${m.run} s`);
  deferred.forEach((f) => f());
  if (allVelocity) m.showVelocity = [...ids];
  if (allForce) m.showForce = [...ids];
  if (allTrails) m.trails = [...ids];
  m.notes.sort((a, b) => a.t - b.t);
  m.showVelocity = [...new Set(m.showVelocity)];
  m.showForce = [...new Set(m.showForce)];
  m.trails = [...new Set(m.trails)];

  problems.sort((a, b) => a.line - b.line);
  return { model: problems.length ? null : m, problems };
}

export function parse(source: string): Model {
  const { model, problems } = parsePhys(source);
  if (!model) throw new PhysSyntaxError(problems);
  return model;
}

/** Mistakes in the text, and scenes that cannot run: [] when fine, otherwise [{ line, message }]. */
export function check(source: string, options: CheckOptions = {}): Problem[] {
  const { model, problems } = parsePhys(source);
  if (!model) return problems;
  const out: Problem[] = [];
  if (options.hasImage) for (const image of model.images) if (!options.hasImage(image.ref)) out.push({ line: image.line, message: `the picture "${image.ref}" is not in the course` });
  const extremes = [Object.fromEntries(model.params.map((p) => [p.name, p.start])), Object.fromEntries(model.params.map((p) => [p.name, p.min])), Object.fromEntries(model.params.map((p) => [p.name, p.max]))];
  for (const given of extremes) {
    const sim = simulate(model, given);
    if (!sim.ok) {
      out.push({ line: 1, message: 'this scene runs away (the numbers blow up) at the start or at an end of a slider. Check for a very light mass on a very stiff spring, or add drag.' });
      break;
    }
    const squashed = model.links.find((l) => {
      const rest = l.rest === undefined ? 0 : typeof l.rest === 'number' ? l.rest : sim.params[l.rest.param];
      return l.kind === 'spring' && shortestSpring(model, sim, l) < 0.1 * rest;
    });
    if (squashed) {
      out.push({ line: squashed.line, message: 'this spring gets squashed to almost nothing (or passes through its own anchor), which a real spring cannot do. Start the mass nearer the rest length, use a longer rest, or a smaller swing.' });
      break;
    }
  }
  return out;
}
