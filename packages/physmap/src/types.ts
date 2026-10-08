/** The shapes of data physmap works with. Everything here is plain data, so it is easy to print and to test. */

/** A mistake in the text, with the line it is on (1 = first line of the block). */
export interface Problem { line: number; message: string }

/** Powers of length, mass and time. Angles and plain numbers are all zeros. */
export interface Dim { L: number; M: number; T: number }

/** A number in SI units (metres, kilograms, seconds), or a slider the reader can move. */
export type Val = number | { param: string };
export type Vec = [Val, Val];

export interface Param {
  name: string; line: number;
  /** All in SI units. */
  min: number; max: number; start: number;
  dim: Dim;
  /** What the reader sees: the unit the author wrote and how many SI units it is. */
  unit: string; factor: number;
  label: string;
}

export interface Body {
  id: string; line: number;
  mass: Val; at: Vec; v: Vec;
  /** Set by `speed=` and `angle=`; the velocity is then worked out from these. */
  launch?: { speed: Val; angle: Val };
  /** Radius for collisions with the ground, in metres. */
  radius: number;
  sprite?: string;
}

export type Endpoint = { point: Vec } | { body: string };
export interface Link { line: number; kind: 'spring' | 'rod'; k: Val; from: Endpoint; to: Endpoint; rest?: Val }

export type Quantity = 'x' | 'y' | 'vx' | 'vy' | 'speed' | 'ke' | 'pe' | 'energy';
export interface Series { body?: string; q: Quantity }
export interface Plot { line: number; series: Series[] }
export interface Note { line: number; t: number; text: string }
export interface Predict { line: number; question: string; answer: string }
export interface Backdrop { ref: string; from: Vec; size: [number, number] }

export interface Model {
  scene: 'mechanics';
  title?: string;
  assumptions: string[];
  params: Param[];
  bodies: Body[];
  links: Link[];
  drags: { body: string; c: Val }[];
  gravity: Val;
  ground?: { y: Val; bounce: Val };
  run: number;
  plots: Plot[];
  showVelocity: string[];
  showForce: string[];
  trails: string[];
  notes: Note[];
  predicts: Predict[];
  backdrop?: Backdrop;
  /** Every image the text refers to, so the page can check and resolve them. */
  images: { line: number; ref: string }[];
}

/** What every body and the system were doing at one moment. */
export interface Sample {
  t: number;
  /** Per body: x, y, vx, vy, net force x, net force y, kinetic energy. */
  b: number[][];
  pe: number;
  energy: number;
}

export interface Simulation {
  samples: Sample[];
  bodyIds: string[];
  /** The part of the world the picture shows, in metres. */
  view: { x0: number; y0: number; x1: number; y1: number };
  maxSpeed: number;
  maxForce: number;
  params: Record<string, number>;
  /** Link ends at the start, for drawing. */
  ok: boolean;
}

export class PhysSyntaxError extends Error {
  problems: Problem[];
  constructor(problems: Problem[]) {
    super(problems.map((p) => `line ${p.line}: ${p.message}`).join('\n'));
    this.name = 'PhysSyntaxError';
    this.problems = problems;
  }
}
