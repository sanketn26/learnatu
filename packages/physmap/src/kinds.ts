import type { Builder, KindInfo, SceneKind } from './scene.ts';
import { parseMechanics } from './mechanics-parse.ts';
import { INFO as MECHANICS, mechanicsScene } from './mechanics.ts';
import { INFO as WAVE, parseWave } from './scene-wave.ts';
import { INFO as RAY, parseRay } from './scene-ray.ts';
import { INFO as FIELD, parseField } from './scene-field.ts';
import { INFO as CYCLE, parseCycle } from './scene-cycle.ts';
import { INFO as CIRCUIT, parseCircuit } from './scene-circuit.ts';
import { INFO as SPACETIME, parseSpacetime } from './scene-spacetime.ts';
import { INFO as BLOCH, parseBloch } from './scene-bloch.ts';

/**
 * Every kind of scene, in one place. To add a kind, write its `scene-<name>.ts` (a parser and an `INFO`) and add one
 * line to BUILT_IN below, plus an example in examples.ts. Nothing else needs to know the kinds: the parser, the
 * playground and the tests all read this registry.
 */
export interface KindDef { kind: SceneKind; parse: Builder; info: KindInfo }

const BUILT_IN: KindDef[] = [
  { kind: 'mechanics', info: MECHANICS, parse: (ctx, stmts) => { const model = parseMechanics(ctx, stmts); return model && !ctx.problems.length ? mechanicsScene(model) : null; } },
  { kind: 'wave', info: WAVE, parse: parseWave },
  { kind: 'ray', info: RAY, parse: parseRay },
  { kind: 'field', info: FIELD, parse: parseField },
  { kind: 'cycle', info: CYCLE, parse: parseCycle },
  { kind: 'circuit', info: CIRCUIT, parse: parseCircuit },
  { kind: 'spacetime', info: SPACETIME, parse: parseSpacetime },
  { kind: 'bloch', info: BLOCH, parse: parseBloch }
];

/** Kinds that are announced but not written yet: they get a "planned" message instead of "unknown". */
export const PLANNED_KINDS: string[] = [];

const registry = new Map<string, KindDef>(BUILT_IN.map((def) => [def.kind, def]));

/** The names of the kinds that are available now, in the order they were registered. Updated by `registerKind`. */
export const SCENE_KINDS: string[] = [...registry.keys()];
/** The field guide for each kind. Updated by `registerKind`. */
export const KIND_INFO: Record<string, KindInfo> = Object.fromEntries(BUILT_IN.map((def) => [def.kind, def.info]));

export const kindDef = (kind: string): KindDef | undefined => registry.get(kind);

/** Adds (or replaces) a kind of scene. */
export function registerKind(def: KindDef): void {
  if (!registry.has(def.kind)) SCENE_KINDS.push(def.kind);
  registry.set(def.kind, def);
  KIND_INFO[def.kind] = def.info;
}
