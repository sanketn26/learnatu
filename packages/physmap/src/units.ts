import type { Dim } from './types.ts';

/**
 * Units and dimensions. Every quantity is turned into SI (metres, kilograms, seconds) and keeps its dimension,
 * so the checker can say "3 m and 2 s measure different things" and the simulation never mixes units.
 */
export interface Unit { factor: number; dim: Dim }

export const dim = (L: number, M: number, T: number, I = 0, K = 0): Dim => ({ L, M, T, I, K });
const d = dim;
const NONE = d(0, 0, 0);

/** Units that stand on their own. `kg` is listed because `k` + `g` would also mean "kilo-gram" only by accident. */
const BASE: Record<string, Unit> = {
  m: { factor: 1, dim: d(1, 0, 0) },
  kg: { factor: 1, dim: d(0, 1, 0) },
  g: { factor: 1e-3, dim: d(0, 1, 0) },
  s: { factor: 1, dim: d(0, 0, 1) },
  N: { factor: 1, dim: d(1, 1, -2) },
  J: { factor: 1, dim: d(2, 1, -2) },
  W: { factor: 1, dim: d(2, 1, -3) },
  Hz: { factor: 1, dim: d(0, 0, -1) },
  A: { factor: 1, dim: d(0, 0, 0, 1) },
  C: { factor: 1, dim: d(0, 0, 1, 1) },
  V: { factor: 1, dim: d(2, 1, -3, -1) },
  ohm: { factor: 1, dim: d(2, 1, -3, -2) },
  F: { factor: 1, dim: d(-2, -1, 4, 2) },
  K: { factor: 1, dim: d(0, 0, 0, 0, 1) },
  Pa: { factor: 1, dim: d(-1, 1, -2) },
  L: { factor: 1e-3, dim: d(3, 0, 0) },
  yr: { factor: 365.25 * 86400, dim: d(0, 0, 1) },
  ly: { factor: 299792458 * 365.25 * 86400, dim: d(1, 0, 0) },
  AU: { factor: 1.495978707e11, dim: d(1, 0, 0) },
  c: { factor: 299792458, dim: d(1, 0, -1) },
  rad: { factor: 1, dim: NONE },
  deg: { factor: Math.PI / 180, dim: NONE }
};
const PREFIX: Record<string, number> = { G: 1e9, M: 1e6, k: 1e3, c: 1e-2, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12 };
const PREFIXABLE = ['m', 's', 'N', 'J', 'W', 'g', 'Hz', 'A', 'C', 'V', 'ohm', 'F', 'Pa', 'L'];

export const UNIT_NAMES = Object.keys(BASE);

const same = (a: Dim, b: Dim) => a.L === b.L && a.M === b.M && a.T === b.T && a.I === b.I && a.K === b.K;
export const sameDim = same;
export const isNone = (a: Dim) => same(a, NONE);
export const NO_DIM = NONE;

function word(text: string): Unit | null {
  if (BASE[text]) return BASE[text];
  const prefix = PREFIX[text[0]];
  const rest = text.slice(1);
  if (prefix && PREFIXABLE.includes(rest)) return { factor: prefix * BASE[rest].factor, dim: BASE[rest].dim };
  return null;
}

/** One unit with an optional power: m, s2, s^2, m-1. */
function power(text: string): Unit | null {
  const match = /^([A-Za-z]+)(?:\^?(-?\d+))?$/.exec(text);
  if (!match) return null;
  const unit = word(match[1]);
  if (!unit) return null;
  const n = match[2] ? Number(match[2]) : 1;
  return { factor: unit.factor ** n, dim: d(unit.dim.L * n, unit.dim.M * n, unit.dim.T * n, unit.dim.I * n, unit.dim.K * n) };
}

/** A unit such as kg, m/s, m/s2, N/m, kg*m/s2. Returns null when any part is not known. */
export function parseUnit(text: string): Unit | null {
  if (!text) return { factor: 1, dim: NONE };
  const [top, ...bottom] = text.split('/');
  let factor = 1;
  const dim = { ...NONE };
  const take = (part: string, sign: 1 | -1): boolean => {
    for (const piece of part.split(/[*·.]/)) {
      const unit = power(piece);
      if (!unit) return false;
      factor = sign === 1 ? factor * unit.factor : factor / unit.factor;
      dim.L += sign * unit.dim.L; dim.M += sign * unit.dim.M; dim.T += sign * unit.dim.T; dim.I += sign * unit.dim.I; dim.K += sign * unit.dim.K;
    }
    return true;
  };
  if (!take(top, 1)) return null;
  for (const part of bottom) if (!take(part, -1)) return null;
  return { factor, dim };
}

export interface Quantity { value: number; dim: Dim; unit: string }

/** "0.5m", "9.8m/s2", "40N/m", "30deg", "3" (a plain number has no dimension). Returns a message when it cannot be read. */
export function parseQuantity(text: string): Quantity | string {
  const match = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*(.*)$/.exec(text);
  if (!match) return `"${text}" is not a number with a unit (like 2kg or 0.5m)`;
  const unit = parseUnit(match[2]);
  if (!unit) return `I don't know the unit "${match[2]}". Known units: ${UNIT_NAMES.join(', ')}, with k, c or m in front of m, s, N, J, W, g`;
  return { value: Number(match[1]) * unit.factor, dim: unit.dim, unit: match[2] };
}

const NAMES: [Dim, string, string][] = [
  [NONE, 'a plain number', ''],
  [d(1, 0, 0), 'a length', 'm'],
  [d(0, 1, 0), 'a mass', 'kg'],
  [d(0, 0, 1), 'a time', 's'],
  [d(1, 0, -1), 'a speed', 'm/s'],
  [d(1, 0, -2), 'an acceleration', 'm/s²'],
  [d(1, 1, -2), 'a force', 'N'],
  [d(2, 1, -2), 'an energy', 'J'],
  [d(2, 1, -3), 'a power', 'W'],
  [d(0, 0, -1), 'a frequency', 'Hz'],
  [d(0, 1, -2), 'a spring stiffness', 'N/m'],
  [d(0, 1, -1), 'a drag coefficient', 'kg/s'],
  [d(0, 0, 0, 1), 'a current', 'A'],
  [d(0, 0, 1, 1), 'a charge', 'C'],
  [d(2, 1, -3, -1), 'a voltage', 'V'],
  [d(2, 1, -3, -2), 'a resistance', 'Ω'],
  [d(-2, -1, 4, 2), 'a capacitance', 'F'],
  [d(0, 0, 0, 0, 1), 'a temperature', 'K'],
  [d(-1, 1, -2), 'a pressure', 'Pa'],
  [d(3, 0, 0), 'a volume', 'm³'],
  [d(1, 1, -3, -1), 'an electric field', 'N/C']
];

/** "a length", or a unit string like "kg·m/s" when there is no everyday name. */
export function dimName(dim: Dim): string {
  const known = NAMES.find(([k]) => same(k, dim));
  if (known) return known[1];
  return `something measured in ${dimSymbol(dim)}`;
}

/** The SI unit of a dimension, as the reader sees it: m, m/s, N, J, kg·m/s... */
export function dimSymbol(dim: Dim): string {
  const known = NAMES.find(([k]) => same(k, dim));
  if (known) return known[2];
  const parts: string[] = [];
  const add = (sym: string, n: number) => { if (n) parts.push(n === 1 ? sym : `${sym}${n === 2 ? '²' : n === 3 ? '³' : `^${n}`}`); };
  const top = { L: Math.max(dim.L, 0), M: Math.max(dim.M, 0), T: Math.max(dim.T, 0), I: Math.max(dim.I, 0), K: Math.max(dim.K, 0) };
  const bottom = { L: Math.max(-dim.L, 0), M: Math.max(-dim.M, 0), T: Math.max(-dim.T, 0), I: Math.max(-dim.I, 0), K: Math.max(-dim.K, 0) };
  add('kg', top.M); add('m', top.L); add('s', top.T); add('A', top.I); add('K', top.K);
  const numerator = parts.splice(0).join('·') || '1';
  add('kg', bottom.M); add('m', bottom.L); add('s', bottom.T); add('A', bottom.I); add('K', bottom.K);
  const denominator = parts.join('·');
  return denominator ? `${numerator}/${denominator}` : numerator;
}
