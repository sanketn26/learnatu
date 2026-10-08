import { PhysSyntaxError } from './types.ts';
import type { Problem } from './types.ts';
import { SCENE_KINDS, extremeValues, startValues } from './scene.ts';
import type { CheckOptions, ParseResult, Scene, SceneKind } from './scene.ts';
import { list, makeCtx, statements, suggest } from './core.ts';
import type { Ctx, Statement } from './core.ts';
import { parseMechanics } from './mechanics-parse.ts';
import { mechanicsScene } from './mechanics.ts';
import { parseWave } from './scene-wave.ts';
import { parseRay } from './scene-ray.ts';
import { parseField } from './scene-field.ts';
import { parseCycle } from './scene-cycle.ts';
import { parseCircuit } from './scene-circuit.ts';
import { parseSpacetime } from './scene-spacetime.ts';
import { parseBloch } from './scene-bloch.ts';

/**
 * Reads the text of a ```phys block into a Scene. The first line says which kind: `scene mechanics`, `scene wave`...
 * `parsePhys` never throws: it returns the scene (when there are no mistakes) and every problem it found.
 * `parse` throws a PhysSyntaxError instead. `check` returns just the problems, and also tries the scene at the
 * start and ends of every slider to make sure it holds together.
 */
type Builder = (ctx: Ctx, stmts: Statement[]) => Scene | null;

const BUILDERS: Partial<Record<SceneKind, Builder>> = {
  mechanics: (ctx, stmts) => {
    const model = parseMechanics(ctx, stmts);
    return model && !ctx.problems.length ? mechanicsScene(model) : null;
  },
  wave: parseWave,
  ray: parseRay,
  field: parseField,
  cycle: parseCycle,
  circuit: parseCircuit,
  spacetime: parseSpacetime,
  bloch: parseBloch
};

/** Slider settings that are left out fall back to each slider's starting value. */
function withDefaults(scene: Scene): void {
  const run = scene.run.bind(scene);
  const verify = scene.verify?.bind(scene);
  scene.run = (values) => run({ ...startValues(scene), ...values });
  if (verify) scene.verify = (values) => verify({ ...startValues(scene), ...values });
}

export function registerScene(kind: SceneKind, builder: Builder): void { BUILDERS[kind] = builder; }

export function parsePhys(source: string): ParseResult {
  const ctx = makeCtx();
  const stmts = statements(source, ctx.problems);
  const sorted = (): Problem[] => ctx.problems.sort((a, b) => a.line - b.line);
  const first = stmts[0];
  if (!first || first.command !== 'scene') {
    ctx.problem(first?.line ?? 1, 'start the block with the kind of scene, for example: scene mechanics');
    return { scene: null, problems: sorted() };
  }
  const kind = first.rest[0]?.text;
  const available = SCENE_KINDS.filter((k) => BUILDERS[k]);
  if (!kind) ctx.problem(first.line, `say which scene: scene ${available[0]}`);
  else if (!(SCENE_KINDS as readonly string[]).includes(kind)) ctx.problem(first.line, `I don't know a "${kind}" scene.${suggest(kind, SCENE_KINDS)} Available now: ${list(available)}`);
  else if (!BUILDERS[kind as SceneKind]) ctx.problem(first.line, `the "${kind}" scene is planned but not available yet. Available now: ${list(available)}`);
  if (ctx.problems.length) return { scene: null, problems: sorted() };

  const rest = stmts.slice(1);
  for (const s of rest) if (s.command === 'scene') ctx.problem(s.line, 'only one "scene" line, and it comes first');
  const scene = (BUILDERS[kind as SceneKind] as Builder)(ctx, rest.filter((s) => s.command !== 'scene'));
  if (scene) withDefaults(scene);
  return { scene: ctx.problems.length ? null : scene, problems: sorted() };
}

export function parse(source: string): Scene {
  const { scene, problems } = parsePhys(source);
  if (!scene) throw new PhysSyntaxError(problems);
  return scene;
}

/** Mistakes in the text, and scenes that cannot run: [] when fine, otherwise [{ line, message }]. */
export function check(source: string, options: CheckOptions = {}): Problem[] {
  const { scene, problems } = parsePhys(source);
  if (!scene) return problems;
  const out: Problem[] = [];
  if (options.hasImage) for (const image of scene.images) if (!options.hasImage(image.ref)) out.push({ line: image.line, message: `the picture "${image.ref}" is not in the course` });
  for (const values of extremeValues(scene)) {
    const run = scene.run(values);
    if (!run.ok) { out.push({ line: 1, message: `${run.problem ?? 'this scene breaks'} (found at the start or at an end of a slider)` }); break; }
    const more = scene.verify?.(values) ?? [];
    if (more.length) { out.push(...more); break; }
  }
  return out;
}
