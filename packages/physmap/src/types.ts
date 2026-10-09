import { SyntaxProblems } from '@learnatu/textmap-core';
import type { Problem } from '@learnatu/textmap-core';
export type { Problem };
/** The shapes of data physmap works with. Everything here is plain data, so it is easy to print and to test. */


/** Powers of length, mass, time, electric current and temperature. Angles and plain numbers are all zeros. */
export interface Dim { L: number; M: number; T: number; I: number; K: number }

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
  /** Distance up the first ramp from its foot. The body starts there, resting on it. */
  slide?: Val;
  /** Radius for collisions with the ground, in metres. */
  radius: number;
  sprite?: string;
}

export type Endpoint = { point: Vec } | { body: string };
export interface Link { line: number; kind: 'spring' | 'rod'; k: Val; from: Endpoint; to: Endpoint; rest?: Val }

export type Quantity = 'x' | 'y' | 'vx' | 'vy' | 'speed' | 'ke' | 'pe' | 'energy' | 'px' | 'py' | 'normal' | 'friction';
export interface Series { body?: string; q: Quantity }
export interface Plot { line: number; series: Series[] }
export interface Note { line: number; t: number; text: string }
export interface Predict { line: number; question: string; answer: string }
/** A floor or a ramp that bodies rest on and slide along. The ground is a ramp at angle 0 that never ends. */
export interface Surface { line: number; kind: 'ground' | 'incline'; from: Vec; angle: Val; length?: Val; bounce: Val; friction: Val }
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
  surfaces: Surface[];
  /** Bodies with a radius bounce off each other. */
  collide?: { bounce: Val };
  run: number;
  plots: Plot[];
  showVelocity: string[];
  showForce: string[];
  showWeight: string[];
  showNormal: string[];
  showFriction: string[];
  trails: string[];
  notes: Note[];
  predicts: Predict[];
  backdrop?: Backdrop;
  /** Written with `view`: the part of the world to draw, replacing the one worked out from the bodies. */
  view?: { x?: [number, number]; y?: [number, number] };
  /** Checks the author turned off with `allow`. */
  allowSquashed?: boolean;
  /** Every image the text refers to, so the page can check and resolve them. */
  images: { line: number; ref: string }[];
}

/** What every body and the system were doing at one moment. */
export interface Sample {
  t: number;
  /** Per body: x, y, vx, vy, net force x, net force y, kinetic energy, normal force x, y, friction force x, y, momentum x, y. */
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
  /** The biggest force arrow of any kind, so that all force arrows share one scale. */
  maxForce: number;
  /** Weight of each body in newtons (mass × g), pointing down. */
  weight: number[];
  params: Record<string, number>;
  /** Link ends at the start, for drawing. */
  ok: boolean;
}

export class PhysSyntaxError extends SyntaxProblems {
  constructor(problems: Problem[]) { super(problems, 'PhysSyntaxError'); }
}
