import type { Param, Predict, Problem } from './types.ts';

/**
 * What every kind of scene (mechanics, wave, ray, field, cycle, circuit, spacetime, bloch) turns into.
 * The browser player only knows this shape, so a new kind of scene needs no new player code.
 *
 * A scene is a recipe with sliders. `run(values)` does the work for one setting of the sliders and returns a Run:
 * a row of moments the reader can scrub through (one moment for a scene that does not change with time),
 * each of which can be drawn as an SVG.
 */
export const SCENE_KINDS = ['mechanics', 'wave', 'ray', 'field', 'cycle', 'circuit', 'spacetime', 'bloch'] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

export interface RenderOptions {
  /** Makes ids unique when several scenes share a page. Default "pm". */
  idPrefix?: string;
  /** Turns the name of a picture in the text into its address on the page. */
  resolveImage?: (ref: string) => string;
}

export interface Run {
  /** How many positions the time slider has. 1 means the picture does not change with time. */
  count: number;
  /** False when the numbers made the scene run away or become impossible; `problem` says why. */
  ok: boolean;
  problem?: string;
  /** The words to show under the picture at moment `i`. */
  caption(i: number): string;
  /** A short label for the slider, like "t = 1.2 s" or "step 2 of 5". */
  clock(i: number): string;
  svg(i: number, options?: RenderOptions): string;
  /** The same moment in plain words, for screen readers. */
  describe(i: number): string;
}

export interface Scene {
  kind: SceneKind;
  title?: string;
  assumptions: string[];
  params: Param[];
  predicts: Predict[];
  /** Seconds one full Play takes. 0 means there is nothing to play (the reader uses the sliders). */
  playSeconds: number;
  /** Pictures the text refers to, so the page can check and resolve them. */
  images: { line: number; ref: string }[];
  run(values: Record<string, number>): Run;
  /** Extra checks for one setting of the sliders (a spring squashed through its anchor, say). Used by `check`. */
  verify?(values: Record<string, number>): Problem[];
}

export interface ParseResult { scene: Scene | null; problems: Problem[] }
export interface CheckOptions { /** Say whether an image the text names exists in the course. When left out, image names are not checked. */ hasImage?: (ref: string) => boolean }

export const startValues = (scene: Pick<Scene, 'params'>): Record<string, number> => Object.fromEntries(scene.params.map((p) => [p.name, p.start]));
/** The slider settings that are most likely to break a scene: the start and both ends of every slider. */
export function extremeValues(scene: Pick<Scene, 'params'>): Record<string, number>[] {
  const pick = (f: (p: Param) => number) => Object.fromEntries(scene.params.map((p) => [p.name, f(p)]));
  return [pick((p) => p.start), pick((p) => p.min), pick((p) => p.max)];
}
