import type { Endpoint, Link, Model, Sample, Simulation, Val, Vec } from './types.ts';

/**
 * Runs a mechanics scene forward in time. Simple on purpose: 2D point masses (or discs when they have a radius),
 * gravity, springs, stiff rods, linear drag, floors and ramps with friction, and collisions between discs, moved by
 * fixed small steps of the classic Runge-Kutta method. It is meant for clear pictures of idealised systems, not for
 * engineering answers.
 */
export const PLANETS: Record<string, number> = { earth: 9.81, moon: 1.62, mars: 3.71, jupiter: 24.79 };

const MAX_STEPS = 2_000_000;
const ROD_K = 1e5;
/** How close to a surface counts as touching it, in metres, and how fast it may still be moving into it. */
const TOUCH = 2e-6;
const STILL = 1e-4;

export const value = (v: Val, params: Record<string, number>): number => (typeof v === 'number' ? v : params[v.param]);
const vec = (v: Vec, params: Record<string, number>): [number, number] => [value(v[0], params), value(v[1], params)];

export function startParams(model: Model): Record<string, number> {
  return Object.fromEntries(model.params.map((p) => [p.name, p.start]));
}

/** A line bodies can rest on: a point, the unit direction along it (t) and out of it (n), how far it goes. */
interface Surf { px: number; py: number; tx: number; ty: number; nx: number; ny: number; len: number; bounce: number; mu: number; /** A ground goes on forever in both directions; a ramp has two ends. */ endless: boolean }
type Anchor = { body: number } | { x: number; y: number };

interface Rules {
  n: number;
  mass: number[];
  g: number;
  drag: number[];
  links: { k: number; rest: number; rod: boolean; a: Anchor; b: Anchor }[];
  surfaces: Surf[];
  radius: number[];
  collide?: number;
}

function endpoint(e: Endpoint, index: Map<string, number>, params: Record<string, number>): Anchor {
  if ('body' in e) return { body: index.get(e.body) as number };
  const [x, y] = vec(e.point, params);
  return { x, y };
}

function surfacesOf(model: Model, params: Record<string, number>): Surf[] {
  return model.surfaces.map((s) => {
    const [px, py] = vec(s.from, params);
    const a = value(s.angle, params);
    return { px, py, tx: Math.cos(a), ty: Math.sin(a), nx: -Math.sin(a), ny: Math.cos(a), len: s.length === undefined ? Infinity : value(s.length, params), bounce: value(s.bounce, params), mu: value(s.friction, params), endless: s.kind === 'ground' };
  });
}

function rules(model: Model, params: Record<string, number>, y0: number[]): Rules {
  const index = new Map(model.bodies.map((b, i) => [b.id, i]));
  const n = model.bodies.length;
  const at = (e: Anchor): [number, number] => ('body' in e ? [y0[4 * e.body], y0[4 * e.body + 1]] : [e.x, e.y]);
  const drag = new Array(n).fill(0);
  for (const dr of model.drags) drag[index.get(dr.body) as number] += value(dr.c, params);
  return {
    n,
    mass: model.bodies.map((b) => value(b.mass, params)),
    g: value(model.gravity, params),
    drag,
    radius: model.bodies.map((b) => b.radius),
    collide: model.collide ? value(model.collide.bounce, params) : undefined,
    surfaces: surfacesOf(model, params),
    links: model.links.map((l) => {
      const a = endpoint(l.from, index, params);
      const b = endpoint(l.to, index, params);
      const [ax, ay] = at(a);
      const [bx, by] = at(b);
      const rod = l.kind === 'rod';
      return { a, b, rod, k: rod ? ROD_K : value(l.k, params), rest: l.rest === undefined ? Math.hypot(bx - ax, by - ay) : value(l.rest, params) };
    })
  };
}

/** The surface body `i` is resting on or sliding along, or -1. */
function touching(r: Rules, s: ArrayLike<number>, i: number): number {
  const x = s[4 * i], y = s[4 * i + 1], vx = s[4 * i + 2], vy = s[4 * i + 3];
  for (let k = 0; k < r.surfaces.length; k++) {
    const f = r.surfaces[k];
    const dx = x - f.px, dy = y - f.py;
    const along = f.tx * dx + f.ty * dy;
    if (!f.endless && (along < -r.radius[i] || along > f.len + r.radius[i])) continue;
    if (f.nx * dx + f.ny * dy - r.radius[i] <= TOUCH && f.nx * vx + f.ny * vy <= STILL) return k;
  }
  return -1;
}

/** Gravity, drag and springs: everything except the contact forces. Returns the potential energy. */
function baseForces(r: Rules, s: ArrayLike<number>, out: Float64Array): number {
  let pe = 0;
  for (let i = 0; i < r.n; i++) {
    out[2 * i] = -r.drag[i] * s[4 * i + 2];
    out[2 * i + 1] = -r.mass[i] * r.g - r.drag[i] * s[4 * i + 3];
    pe += r.mass[i] * r.g * s[4 * i + 1];
  }
  for (const l of r.links) {
    const pa = 'body' in l.a ? [s[4 * l.a.body], s[4 * l.a.body + 1], s[4 * l.a.body + 2], s[4 * l.a.body + 3]] : [l.a.x, l.a.y, 0, 0];
    const pb = 'body' in l.b ? [s[4 * l.b.body], s[4 * l.b.body + 1], s[4 * l.b.body + 2], s[4 * l.b.body + 3]] : [l.b.x, l.b.y, 0, 0];
    const dx = pb[0] - pa[0];
    const dy = pb[1] - pa[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) continue;
    const ux = dx / len;
    const uy = dy / len;
    const ext = len - l.rest;
    let f = l.k * ext;
    if (l.rod) {
      const m = 'body' in l.a && 'body' in l.b ? Math.min(r.mass[l.a.body], r.mass[l.b.body]) : 'body' in l.a ? r.mass[l.a.body] : r.mass[(l.b as { body: number }).body];
      f += Math.sqrt(l.k * m) * ((pb[2] - pa[2]) * ux + (pb[3] - pa[3]) * uy);
    } else pe += 0.5 * l.k * ext * ext;
    if ('body' in l.a) { out[2 * l.a.body] += f * ux; out[2 * l.a.body + 1] += f * uy; }
    if ('body' in l.b) { out[2 * l.b.body] -= f * ux; out[2 * l.b.body + 1] -= f * uy; }
  }
  return pe;
}

/**
 * Net force on every body for the state `s` = [x, y, vx, vy] per body, and the potential energy.
 * Bodies in contact with a surface also feel the normal force (exactly enough to stop them sinking in) and friction
 * (kinetic while sliding, static up to μN while held). `contact` records those: per body Nx, Ny, Fx, Fy.
 */
function forces(r: Rules, s: ArrayLike<number>, out: Float64Array, contact?: Float64Array): number {
  const pe = baseForces(r, s, out);
  if (contact) contact.fill(0);
  if (r.surfaces.length) {
    for (let i = 0; i < r.n; i++) {
      const k = touching(r, s, i);
      if (k < 0) continue;
      const f = r.surfaces[k];
      const fx = out[2 * i], fy = out[2 * i + 1];
      const N = Math.max(0, -(fx * f.nx + fy * f.ny));
      const pull = fx * f.tx + fy * f.ty;
      const slide = s[4 * i + 2] * f.tx + s[4 * i + 3] * f.ty;
      const limit = f.mu * N;
      const friction = Math.abs(slide) > STILL ? -limit * Math.sign(slide) : Math.abs(pull) <= limit ? -pull : -limit * Math.sign(pull);
      out[2 * i] += N * f.nx + friction * f.tx;
      out[2 * i + 1] += N * f.ny + friction * f.ty;
      if (contact) { contact[4 * i] = N * f.nx; contact[4 * i + 1] = N * f.ny; contact[4 * i + 2] = friction * f.tx; contact[4 * i + 3] = friction * f.ty; }
    }
  }
  return pe;
}

function derivative(r: Rules, s: Float64Array, d: Float64Array, f: Float64Array) {
  forces(r, s, f);
  for (let i = 0; i < r.n; i++) {
    d[4 * i] = s[4 * i + 2];
    d[4 * i + 1] = s[4 * i + 3];
    d[4 * i + 2] = f[2 * i] / r.mass[i];
    d[4 * i + 3] = f[2 * i + 1] / r.mass[i];
  }
}

/** After a step: stop bodies sinking into surfaces (bouncing them), and bounce discs off each other. */
function resolve(r: Rules, s: Float64Array, dt: number) {
  // sliding friction cannot reverse a body: when it would stop within this step, and the rest of the forces cannot
  // overcome static friction, it stops
  if (r.surfaces.length) {
    const f0 = new Float64Array(2 * r.n);
    baseForces(r, s, f0);
    for (let i = 0; i < r.n; i++) {
      const k = touching(r, s, i);
      if (k < 0 || r.surfaces[k].mu <= 0) continue;
      const f = r.surfaces[k];
      const N = Math.max(0, -(f0[2 * i] * f.nx + f0[2 * i + 1] * f.ny));
      const pull = f0[2 * i] * f.tx + f0[2 * i + 1] * f.ty;
      const slide = s[4 * i + 2] * f.tx + s[4 * i + 3] * f.ty;
      if (Math.abs(pull) <= f.mu * N && Math.abs(slide) <= ((f.mu * N) / r.mass[i]) * dt * 1.5) { s[4 * i + 2] -= slide * f.tx; s[4 * i + 3] -= slide * f.ty; }
    }
  }
  for (let i = 0; i < r.n; i++) {
    for (const f of r.surfaces) {
      const dx = s[4 * i] - f.px, dy = s[4 * i + 1] - f.py;
      const along = f.tx * dx + f.ty * dy;
      if (!f.endless && (along < 0 || along > f.len)) continue;
      const d = f.nx * dx + f.ny * dy - r.radius[i];
      if (d >= 0) continue;
      s[4 * i] -= d * f.nx; s[4 * i + 1] -= d * f.ny;
      const vn = f.nx * s[4 * i + 2] + f.ny * s[4 * i + 3];
      if (vn >= 0) continue;
      const keep = -f.bounce * vn;
      const target = keep < 1e-2 ? 0 : keep;
      s[4 * i + 2] += (target - vn) * f.nx; s[4 * i + 3] += (target - vn) * f.ny;
    }
  }
  if (r.collide === undefined) return;
  for (let i = 0; i < r.n; i++) for (let j = i + 1; j < r.n; j++) {
    const dx = s[4 * j] - s[4 * i], dy = s[4 * j + 1] - s[4 * i + 1];
    const dist = Math.hypot(dx, dy), reach = r.radius[i] + r.radius[j];
    if (dist >= reach || dist < 1e-12) continue;
    const nx = dx / dist, ny = dy / dist;
    const overlap = reach - dist, wi = r.mass[j] / (r.mass[i] + r.mass[j]), wj = 1 - wi;
    s[4 * i] -= nx * overlap * wi; s[4 * i + 1] -= ny * overlap * wi;
    s[4 * j] += nx * overlap * wj; s[4 * j + 1] += ny * overlap * wj;
    const vn = (s[4 * j + 2] - s[4 * i + 2]) * nx + (s[4 * j + 3] - s[4 * i + 3]) * ny;
    if (vn >= 0) continue;
    const J = (-(1 + r.collide) * vn) / (1 / r.mass[i] + 1 / r.mass[j]);
    s[4 * i + 2] -= (J / r.mass[i]) * nx; s[4 * i + 3] -= (J / r.mass[i]) * ny;
    s[4 * j + 2] += (J / r.mass[j]) * nx; s[4 * j + 3] += (J / r.mass[j]) * ny;
  }
}

function sample(r: Rules, s: Float64Array, t: number): Sample {
  const f = new Float64Array(2 * r.n);
  const contact = new Float64Array(4 * r.n);
  const pe = forces(r, s, f, contact);
  const b: number[][] = [];
  let ke = 0;
  for (let i = 0; i < r.n; i++) {
    const k = 0.5 * r.mass[i] * (s[4 * i + 2] ** 2 + s[4 * i + 3] ** 2);
    ke += k;
    b.push([s[4 * i], s[4 * i + 1], s[4 * i + 2], s[4 * i + 3], f[2 * i], f[2 * i + 1], k, contact[4 * i], contact[4 * i + 1], contact[4 * i + 2], contact[4 * i + 3], r.mass[i] * s[4 * i + 2], r.mass[i] * s[4 * i + 3]]);
  }
  return { t, b, pe, energy: ke + pe };
}

export function simulate(model: Model, given: Record<string, number> = {}): Simulation {
  const params = { ...startParams(model), ...given };
  const n = model.bodies.length;
  const s = new Float64Array(4 * n);
  model.bodies.forEach((b, i) => {
    const [x, y] = vec(b.at, params);
    let [vx, vy] = vec(b.v, params);
    if (b.launch) {
      const speed = value(b.launch.speed, params);
      const angle = value(b.launch.angle, params);
      vx = speed * Math.cos(angle);
      vy = speed * Math.sin(angle);
    }
    if (b.slide !== undefined) {
      const k = model.surfaces.findIndex((f) => f.kind === 'incline');
      const f = surfacesOf(model, params)[k];
      const along = value(b.slide, params);
      s.set([f.px + f.tx * along + f.nx * b.radius, f.py + f.ty * along + f.ny * b.radius, vx, vy], 4 * i);
      return;
    }
    s.set([x, y, vx, vy], 4 * i);
  });
  const r = rules(model, params, Array.from(s));
  const stiff = model.links.some((l) => l.kind === 'rod');
  const count = Math.min(1200, Math.max(2, Math.round(model.run * 60)));
  const every = model.run / count;
  const maxDt = stiff ? 2e-4 : 1e-3;
  const sub = Math.ceil(every / maxDt);
  const dt = every / sub;
  resolve(r, s, 0);
  const samples: Sample[] = [sample(r, s, 0)];
  const weight = r.mass.map((m) => m * r.g);
  const ids = model.bodies.map((b) => b.id);
  let ok = count * sub <= MAX_STEPS;
  if (ok) {
    const k1 = new Float64Array(4 * n), k2 = new Float64Array(4 * n), k3 = new Float64Array(4 * n), k4 = new Float64Array(4 * n);
    const tmp = new Float64Array(4 * n);
    const f = new Float64Array(2 * n);
    for (let c = 1; c <= count && ok; c++) {
      for (let j = 0; j < sub; j++) {
        derivative(r, s, k1, f);
        for (let q = 0; q < s.length; q++) tmp[q] = s[q] + 0.5 * dt * k1[q];
        derivative(r, tmp, k2, f);
        for (let q = 0; q < s.length; q++) tmp[q] = s[q] + 0.5 * dt * k2[q];
        derivative(r, tmp, k3, f);
        for (let q = 0; q < s.length; q++) tmp[q] = s[q] + dt * k3[q];
        derivative(r, tmp, k4, f);
        for (let q = 0; q < s.length; q++) s[q] += (dt / 6) * (k1[q] + 2 * k2[q] + 2 * k3[q] + k4[q]);
        resolve(r, s, dt);
      }
      if (!s.every(Number.isFinite)) { ok = false; break; }
      samples.push(sample(r, s, c * every));
    }
  }
  if (!ok) return { samples, bodyIds: ids, view: { x0: -1, y0: -1, x1: 1, y1: 1 }, maxSpeed: 1, maxForce: 1, weight, params, ok };
  return { samples, bodyIds: ids, view: viewOf(model, r, samples, params), maxSpeed: peak(samples, [2]), maxForce: Math.max(peak(samples, [4, 7, 9]), ...weight, 1e-12), weight, params, ok };
}

/** The biggest vector length among the (x, y) column pairs starting at each given column. */
function peak(samples: Sample[], cols: number[]): number {
  let m = 0;
  for (const s of samples) for (const b of s.b) for (const c of cols) m = Math.max(m, Math.hypot(b[c], b[c + 1]));
  return m || 1;
}

/** The rectangle to show: everything the bodies visit, the link ends, the surfaces and the backdrop, with some room. */
function viewOf(model: Model, r: Rules, samples: Sample[], params: Record<string, number>) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x: number, y: number) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const s of samples) for (const b of s.b) add(b[0], b[1]);
  for (const l of r.links) for (const e of [l.a, l.b]) if (!('body' in e)) add(e.x, e.y);
  let floor = Infinity;
  for (const f of r.surfaces) {
    if (Number.isFinite(f.len)) { add(f.px, f.py); add(f.px + f.tx * f.len, f.py + f.ty * f.len); add(f.px + f.tx * f.len, f.py); } else floor = Math.min(floor, f.py);
  }
  if (Number.isFinite(floor)) y0 = Math.min(y0, floor);
  if (model.backdrop) {
    const [bx, by] = vec(model.backdrop.from, params);
    add(bx, by);
    add(bx + model.backdrop.size[0], by + model.backdrop.size[1]);
  }
  const rad = Math.max(0, ...r.radius);
  x0 -= rad; y0 -= rad; x1 += rad; y1 += rad;
  const pad = Math.max(x1 - x0, y1 - y0, 1e-3) * 0.12;
  // a floor is the bottom of the picture: a little room under it, not a band of empty space
  const bottom = Number.isFinite(floor) ? Math.min(y0, floor) - pad * 0.35 : y0 - pad;
  const auto = { x0: x0 - pad, y0: bottom, x1: x1 + pad, y1: y1 + pad };
  // a `view` line in the text wins, axis by axis
  const { x, y } = model.view ?? {};
  return { x0: x ? x[0] : auto.x0, x1: x ? x[1] : auto.x1, y0: y ? y[0] : auto.y0, y1: y ? y[1] : auto.y1 };
}

/** The shortest a spring gets during the run, in metres. Rods and links without a rest length are skipped (Infinity). */
export function shortestSpring(_model: Model, sim: Simulation, link: Link): number {
  if (link.kind !== 'spring') return Infinity;
  const at = (e: Endpoint, s: Sample): [number, number] =>
    'body' in e ? [s.b[sim.bodyIds.indexOf(e.body)][0], s.b[sim.bodyIds.indexOf(e.body)][1]] : vec(e.point, sim.params);
  let shortest = Infinity;
  for (const s of sim.samples) {
    const a = at(link.from, s);
    const b = at(link.to, s);
    shortest = Math.min(shortest, Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return shortest;
}
