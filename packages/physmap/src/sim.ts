import type { Endpoint, Link, Model, Sample, Simulation, Val, Vec } from './types.ts';

/**
 * Runs a scene forward in time. Simple on purpose: 2D point masses, gravity, springs, stiff rods, linear drag and a
 * bouncing ground, moved by fixed small steps of the classic Runge-Kutta method. It is meant for clear pictures of
 * idealised systems, not for engineering answers.
 */
export const PLANETS: Record<string, number> = { earth: 9.81, moon: 1.62, mars: 3.71, jupiter: 24.79 };

const MAX_STEPS = 2_000_000;
const ROD_K = 1e5;

export const value = (v: Val, params: Record<string, number>): number => (typeof v === 'number' ? v : params[v.param]);
const vec = (v: Vec, params: Record<string, number>): [number, number] => [value(v[0], params), value(v[1], params)];

export function startParams(model: Model): Record<string, number> {
  return Object.fromEntries(model.params.map((p) => [p.name, p.start]));
}

interface Rules {
  n: number;
  mass: number[];
  g: number;
  drag: number[];
  links: { k: number; rest: number; rod: boolean; a: { body: number } | { x: number; y: number }; b: { body: number } | { x: number; y: number } }[];
  ground?: { y: number; bounce: number };
  radius: number[];
}

function endpoint(e: Endpoint, index: Map<string, number>, params: Record<string, number>) {
  if ('body' in e) return { body: index.get(e.body) as number };
  const [x, y] = vec(e.point, params);
  return { x, y };
}

function rules(model: Model, params: Record<string, number>, y0: number[]): Rules {
  const index = new Map(model.bodies.map((b, i) => [b.id, i]));
  const n = model.bodies.length;
  const at = (e: { body: number } | { x: number; y: number }): [number, number] =>
    'body' in e ? [y0[4 * e.body], y0[4 * e.body + 1]] : [e.x, e.y];
  const drag = new Array(n).fill(0);
  for (const dr of model.drags) drag[index.get(dr.body) as number] += value(dr.c, params);
  return {
    n,
    mass: model.bodies.map((b) => value(b.mass, params)),
    g: value(model.gravity, params),
    drag,
    radius: model.bodies.map((b) => b.radius),
    ground: model.ground ? { y: value(model.ground.y, params), bounce: value(model.ground.bounce, params) } : undefined,
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

/** Net force on every body for the state `s` = [x, y, vx, vy] per body. Also returns the potential energy. */
function forces(r: Rules, s: ArrayLike<number>, out: Float64Array): number {
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

function derivative(r: Rules, s: Float64Array, d: Float64Array, f: Float64Array) {
  forces(r, s, f);
  for (let i = 0; i < r.n; i++) {
    d[4 * i] = s[4 * i + 2];
    d[4 * i + 1] = s[4 * i + 3];
    d[4 * i + 2] = f[2 * i] / r.mass[i];
    d[4 * i + 3] = f[2 * i + 1] / r.mass[i];
  }
}

function sample(r: Rules, s: Float64Array, t: number): Sample {
  const f = new Float64Array(2 * r.n);
  const pe = forces(r, s, f);
  const b: number[][] = [];
  let ke = 0;
  for (let i = 0; i < r.n; i++) {
    const k = 0.5 * r.mass[i] * (s[4 * i + 2] ** 2 + s[4 * i + 3] ** 2);
    ke += k;
    b.push([s[4 * i], s[4 * i + 1], s[4 * i + 2], s[4 * i + 3], f[2 * i], f[2 * i + 1], k]);
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
    s.set([x, y, vx, vy], 4 * i);
  });
  const r = rules(model, params, Array.from(s));
  const stiff = model.links.some((l) => l.kind === 'rod');
  const count = Math.min(1200, Math.max(2, Math.round(model.run * 60)));
  const every = model.run / count;
  const maxDt = stiff ? 2e-4 : 1e-3;
  const sub = Math.ceil(every / maxDt);
  const dt = every / sub;
  const samples: Sample[] = [sample(r, s, 0)];
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
        if (r.ground) {
          for (let i = 0; i < n; i++) {
            const floor = r.ground.y + r.radius[i];
            if (s[4 * i + 1] < floor && s[4 * i + 3] < 0) {
              s[4 * i + 1] = floor;
              s[4 * i + 3] = -r.ground.bounce * s[4 * i + 3];
              if (Math.abs(s[4 * i + 3]) < 1e-2) s[4 * i + 3] = 0;
            }
          }
        }
      }
      if (!s.every(Number.isFinite)) { ok = false; break; }
      samples.push(sample(r, s, c * every));
    }
  }
  if (!ok) return { samples, bodyIds: model.bodies.map((b) => b.id), view: { x0: -1, y0: -1, x1: 1, y1: 1 }, maxSpeed: 1, maxForce: 1, params, ok };
  return { samples, bodyIds: model.bodies.map((b) => b.id), view: viewOf(model, r, samples, params), maxSpeed: peak(samples, 2), maxForce: peak(samples, 4), params, ok };
}

function peak(samples: Sample[], at: 2 | 4): number {
  let m = 0;
  for (const s of samples) for (const b of s.b) m = Math.max(m, Math.hypot(b[at], b[at + 1]));
  return m || 1;
}

/** The rectangle to show: everything the bodies visit, the link ends, the ground and the backdrop, with some room. */
function viewOf(model: Model, r: Rules, samples: Sample[], params: Record<string, number>) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x: number, y: number) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const s of samples) for (const b of s.b) add(b[0], b[1]);
  for (const l of r.links) for (const e of [l.a, l.b]) if (!('body' in e)) add(e.x, e.y);
  if (r.ground) y0 = Math.min(y0, r.ground.y);
  if (model.backdrop) {
    const [bx, by] = vec(model.backdrop.from, params);
    add(bx, by);
    add(bx + model.backdrop.size[0], by + model.backdrop.size[1]);
  }
  const rad = Math.max(0, ...r.radius);
  x0 -= rad; y0 -= rad; x1 += rad; y1 += rad;
  const pad = Math.max(x1 - x0, y1 - y0, 1e-3) * 0.12;
  // the ground is the bottom of the picture: a little room under it, not a band of empty space
  const bottom = r.ground ? Math.min(y0, r.ground.y) - pad * 0.35 : y0 - pad;
  return { x0: x0 - pad, y0: bottom, x1: x1 + pad, y1: y1 + pad };
}

/** The shortest a spring gets during the run, in metres. Rods and links without a rest length are skipped (Infinity). */
export function shortestSpring(model: Model, sim: Simulation, link: Link): number {
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
