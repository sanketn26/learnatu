import type { Body, Dim, Endpoint, Link, Model, Plot, Series, Vec } from './types.ts';
import { NO_DIM, dim, dimName, sameDim } from './units.ts';
import { PLANETS } from './mechanics-sim.ts';
import { list, suggest } from './core.ts';
import type { Ctx, Statement } from './core.ts';

/**
 * Reads the statements of a `scene mechanics` block into a Model. See the README for the language.
 * Mistakes go to `ctx.problems` with their line numbers; the model is only meaningful when there are none.
 */

const ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
const L: Dim = dim(1, 0, 0);
const M: Dim = dim(0, 1, 0);
const T: Dim = dim(0, 0, 1);
const SPEED: Dim = dim(1, 0, -1);
const ACCEL: Dim = dim(1, 0, -2);
const STIFF: Dim = dim(0, 1, -2);
const DRAG: Dim = dim(0, 1, -1);
const ENERGY: Dim = dim(2, 1, -2);
const MOMENTUM: Dim = dim(1, 1, -1);
const FORCE: Dim = dim(1, 1, -2);


const COMMON = ['title', 'assume', 'param', 'predict'];
const KEYWORDS = [...COMMON, 'body', 'gravity', 'spring', 'rod', 'drag', 'ground', 'incline', 'collide', 'run', 'plot', 'show', 'trail', 'note', 'backdrop', 'view', 'allow'];
const SHOWS = ['velocity', 'force', 'weight', 'normal', 'friction'];
/** body: whether the quantity belongs to a body (yes), to the whole scene (no), or can be either (kinetic energy). */
const QUANTITIES: Record<string, { dim: Dim; body: 'yes' | 'no' | 'either' }> = {
  x: { dim: L, body: 'yes' }, y: { dim: L, body: 'yes' }, vx: { dim: SPEED, body: 'yes' }, vy: { dim: SPEED, body: 'yes' },
  speed: { dim: SPEED, body: 'yes' }, ke: { dim: ENERGY, body: 'either' }, pe: { dim: ENERGY, body: 'no' }, energy: { dim: ENERGY, body: 'no' },
  px: { dim: MOMENTUM, body: 'either' }, py: { dim: MOMENTUM, body: 'either' }, normal: { dim: FORCE, body: 'yes' }, friction: { dim: FORCE, body: 'yes' }
};
const MAX_RUN = 3600;

export function parseMechanics(ctx: Ctx, stmts: Statement[]): Model | null {
  const { problem, value, vector, args, problems } = ctx;
  const m: Model = {
    scene: 'mechanics', assumptions: [], params: [], bodies: [], links: [], drags: [], gravity: 0, run: 0,
    surfaces: [], plots: [], showVelocity: [], showForce: [], showWeight: [], showNormal: [], showFriction: [], trails: [], notes: [], predicts: [], images: []
  };
  ctx.enable('view', 'allow');
  ctx.allowChoices = ['squashed'];
  const deferred: (() => void)[] = [];
  let sawRun = false;
  let allVelocity = false, allForce = false, allTrails = false, allWeight = false, allNormal = false, allFriction = false;

  for (const { line, command, rest } of stmts) {
    if (ctx.common({ line, command, rest })) continue;
    switch (command) {
      case 'body': {
        const a = args(rest, ['mass', 'at', 'slide', 'v', 'speed', 'angle', 'radius', 'sprite'], line, 'body');
        const id = a.words[0];
        if (!id || !ID.test(id)) { problem(line, 'body needs a name: body ball mass=1kg at=(0m,2m)'); break; }
        if (m.bodies.some((b) => b.id === id)) { problem(line, `there is already a body called "${id}"`); break; }
        if (a.words.length > 1) problem(line, `unexpected "${a.words[1]}": write properties as name=value, like mass=2kg`);
        if (a.props.has('slide') && a.props.has('at')) problem(line, 'give either at=(x,y) or slide=…m (a place along the ramp), not both');
        for (const need of a.props.has('slide') ? ['mass'] : ['mass', 'at']) if (!a.props.has(need)) problem(line, `body "${id}" needs ${need}=${need === 'mass' ? '…kg' : '(x,y), or slide=…m to start on a ramp'}`);
        if (a.props.has('v') && (a.props.has('speed') || a.props.has('angle'))) problem(line, 'give either v=(…) or speed= and angle=, not both');
        if (a.props.has('speed') !== a.props.has('angle')) problem(line, 'speed and angle go together: speed=20m/s angle=30deg');
        const get = (k: string) => a.props.get(k)?.text;
        const mass = get('mass') ? value(get('mass') as string, M, 'mass', line) : null;
        const slide = get('slide') ? value(get('slide') as string, L, 'slide', line) : undefined;
        const at = get('at') ? vector(get('at') as string, L, 'at', line) : slide !== undefined && slide !== null ? ([0, 0] as Vec) : null;
        const v = get('v') ? vector(get('v') as string, SPEED, 'v', line) : ([0, 0] as Vec);
        const speed = get('speed') ? value(get('speed') as string, SPEED, 'speed', line) : null;
        const angle = get('angle') ? value(get('angle') as string, NO_DIM, 'angle', line, true) : null;
        const radius = get('radius') ? value(get('radius') as string, L, 'radius', line) : 0;
        if (typeof radius === 'object' && radius !== null) problem(line, 'radius cannot be a slider');
        if (mass === null || at === null || v === null) break;
        const body: Body = { id, line, mass, at, v, radius: typeof radius === 'number' ? radius : 0 };
        if (slide !== undefined && slide !== null) body.slide = slide;
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
        const a = args(rest, ['y', 'bounce', 'friction'], line, 'ground');
        if (a.words.length) problem(line, `unexpected "${a.words[0]}": write ground y=0m bounce=0.7 friction=0.3`);
        if (m.surfaces.some((s) => s.kind === 'ground')) { problem(line, 'only one ground'); break; }
        const y = a.props.has('y') ? value(a.props.get('y')?.text as string, L, 'y', line) : 0;
        const bounce = a.props.has('bounce') ? value(a.props.get('bounce')?.text as string, NO_DIM, 'bounce', line) : 0;
        const friction = a.props.has('friction') ? value(a.props.get('friction')?.text as string, NO_DIM, 'friction', line) : 0;
        if (typeof bounce === 'number' && (bounce < 0 || bounce > 1)) { problem(line, 'bounce is a number from 0 (no bounce) to 1 (perfect bounce)'); break; }
        if (typeof friction === 'number' && friction < 0) { problem(line, 'friction is a number from 0 (ice) upwards; rubber on dry concrete is about 0.8'); break; }
        if (y !== null && bounce !== null && friction !== null) m.surfaces.push({ line, kind: 'ground', from: [0, y], angle: 0, bounce, friction });
        break;
      }
      case 'incline': {
        const a = args(rest, ['from', 'angle', 'length', 'bounce', 'friction'], line, 'incline');
        if (a.words.length) problem(line, `unexpected "${a.words[0]}": write incline from=(0m,0m) angle=30deg length=5m friction=0.2`);
        for (const need of ['from', 'angle', 'length']) if (!a.props.has(need)) problem(line, `incline needs ${need}=…`);
        const from = a.props.has('from') ? vector(a.props.get('from')?.text as string, L, 'from', line) : null;
        const angle = a.props.has('angle') ? value(a.props.get('angle')?.text as string, NO_DIM, 'angle', line, true) : null;
        const length = a.props.has('length') ? value(a.props.get('length')?.text as string, L, 'length', line) : null;
        const bounce = a.props.has('bounce') ? value(a.props.get('bounce')?.text as string, NO_DIM, 'bounce', line) : 0;
        const friction = a.props.has('friction') ? value(a.props.get('friction')?.text as string, NO_DIM, 'friction', line) : 0;
        if (typeof angle === 'number' && (Math.abs(angle) >= (89 * Math.PI) / 180 || angle === 0)) { problem(line, 'incline angle must be between 0° and 90° (not including either), or negative for a slope down to the right; use ground for a flat floor'); break; }
        if (typeof bounce === 'number' && (bounce < 0 || bounce > 1)) { problem(line, 'bounce is a number from 0 (no bounce) to 1 (perfect bounce)'); break; }
        if (typeof friction === 'number' && friction < 0) { problem(line, 'friction is a number from 0 (ice) upwards'); break; }
        if (typeof length === 'number' && length <= 0) { problem(line, 'incline length must be above zero'); break; }
        if (from && angle !== null && length !== null && bounce !== null && friction !== null) m.surfaces.push({ line, kind: 'incline', from, angle, length, bounce, friction });
        break;
      }
      case 'collide': {
        const a = args(rest, ['bounce'], line, 'collide');
        if (a.words.length) problem(line, `unexpected "${a.words[0]}": write collide bounce=1 (1 = elastic, 0 = bodies stick together)`);
        if (m.collide) { problem(line, 'only one "collide" line'); break; }
        const bounce = a.props.has('bounce') ? value(a.props.get('bounce')?.text as string, NO_DIM, 'bounce', line) : 1;
        if (typeof bounce === 'number' && (bounce < 0 || bounce > 1)) { problem(line, 'bounce is a number from 0 (bodies stick) to 1 (perfectly elastic)'); break; }
        if (bounce !== null) m.collide = { bounce };
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
        // any number of kinds, then optionally body names: `show weight normal friction`, `show velocity ball`
        const kinds = rest.map((t) => t.text).filter((t) => SHOWS.includes(t));
        const ids = rest.map((t) => t.text).filter((t) => !SHOWS.includes(t));
        if (!kinds.length) { problem(line, `show needs one or more of ${list(SHOWS)}, then optionally body names.${rest[0] ? suggest(rest[0].text, SHOWS) : ''}`); break; }
        const targets: Record<string, [string[], () => void]> = {
          velocity: [m.showVelocity, () => { allVelocity = true; }], force: [m.showForce, () => { allForce = true; }], weight: [m.showWeight, () => { allWeight = true; }],
          normal: [m.showNormal, () => { allNormal = true; }], friction: [m.showFriction, () => { allFriction = true; }]
        };
        for (const kind of kinds) { if (ids.length) targets[kind][0].push(...ids); else targets[kind][1](); }
        deferred.push(() => ids.forEach((id) => { if (!m.bodies.some((b) => b.id === id)) problem(line, `there is no body called "${id}".${suggest(id, [...m.bodies.map((b) => b.id), ...SHOWS])}`); }));
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
  }

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
  if (allWeight) m.showWeight = [...ids];
  if (allNormal) m.showNormal = [...ids];
  if (allFriction) m.showFriction = [...ids];
  if (allTrails) m.trails = [...ids];
  m.notes.sort((a, b) => a.t - b.t);
  m.showVelocity = [...new Set(m.showVelocity)];
  m.showForce = [...new Set(m.showForce)];
  m.showWeight = [...new Set(m.showWeight)];
  m.showNormal = [...new Set(m.showNormal)];
  m.showFriction = [...new Set(m.showFriction)];
  if (m.bodies.some((b) => b.slide !== undefined) && !m.surfaces.some((x) => x.kind === 'incline')) problem(m.bodies.find((b) => b.slide !== undefined)?.line ?? 1, 'slide=… places a body on a ramp, but there is no incline: add incline from=(0m,0m) angle=30deg length=5m');
  if (m.collide && m.bodies.some((b) => b.radius <= 0)) problem(m.bodies.find((b) => b.radius <= 0)?.line ?? 1, 'bodies that collide need a size: add radius=0.1m to every body');
  if ((m.showNormal.length || m.showFriction.length || m.plots.some((p) => p.series.some((s) => s.q === 'normal' || s.q === 'friction'))) && !m.surfaces.length) problem(1, 'normal force and friction need something to rest on: add a ground or an incline');
  m.trails = [...new Set(m.trails)];

  m.title = ctx.title;
  m.assumptions = ctx.assumptions;
  m.params = [...ctx.params.values()];
  m.predicts = ctx.predicts;
  if (ctx.view) m.view = ctx.view;
  if (ctx.allowed.has('squashed')) m.allowSquashed = true;
  return m;
}
