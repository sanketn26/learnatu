import type { Param, Predict, Problem } from './types.ts';

/**
 * What every kind of scene turns into (the kinds are registered in kinds.ts).
 * The browser player only knows this shape, so a new kind of scene needs no new player code.
 *
 * A scene is a recipe with sliders. `run(values)` does the work for one setting of the sliders and returns a Run:
 * a row of moments the reader can scrub through (one moment for a scene that does not change with time),
 * each of which can be drawn as an SVG.
 */
export type SceneKind = string;

/** What a kind is for, what it cannot do, and the words it understands. The playground shows it as a field guide. */
export interface KindInfo { title: string; summary: string; cannot: string; words: string[] }

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

/** Reads the statements of one kind of scene. Records mistakes in `ctx`; returns null when it cannot build a scene. */
export type Builder = (ctx: import('./core.ts').Ctx, stmts: import('./core.ts').Statement[]) => Scene | null;

export interface ParseResult { scene: Scene | null; problems: Problem[] }
export interface CheckOptions { /** Say whether an image the text names exists in the course. When left out, image names are not checked. */ hasImage?: (ref: string) => boolean }

export const startValues = (scene: Pick<Scene, 'params'>): Record<string, number> => Object.fromEntries(scene.params.map((p) => [p.name, p.start]));
/** One setting of the sliders to try, with a plain-words description and the sliders that are away from their start. */
export interface Setting { values: Record<string, number>; words: string; moved: Param[] }

/**
 * The slider settings most likely to break a scene: the start, every slider at its low end, every slider at its high
 * end, then every mix of low and high ends. With more than four sliders the mixes are a fixed spread of 16, so the
 * same text always gets the same checks.
 */
export function settingsToTry(scene: Pick<Scene, 'params'>): Setting[] {
  const { params } = scene;
  const make = (pick: (p: Param, i: number) => number): Setting => {
    const values = Object.fromEntries(params.map((p, i) => [p.name, pick(p, i)]));
    const moved = params.filter((p) => values[p.name] !== p.start);
    const words = moved.length ? moved.map((p) => `"${p.name}" at ${values[p.name] === p.min ? 'its low end' : 'its high end'}`).join(' and ') : 'the starting settings';
    return { values, words, moved };
  };
  const out: Setting[] = [make((p) => p.start), make((p) => p.min), make((p) => p.max)];
  const mixes = params.length <= 4 ? 1 << params.length : 16;
  if (params.length > 1) {
    for (let m = 0; m < mixes; m++) {
      const bits = params.length <= 4 ? m : (m * 2654435761) >>> 0;
      out.push(make((p, i) => ((bits >> i) & 1 ? p.max : p.min)));
    }
  }
  const seen = new Set<string>();
  return out.filter((s) => { const key = JSON.stringify(s.values); if (seen.has(key)) return false; seen.add(key); return true; });
}

/** The same settings, as plain values. */
export const extremeValues = (scene: Pick<Scene, 'params'>): Record<string, number>[] => settingsToTry(scene).map((s) => s.values);
