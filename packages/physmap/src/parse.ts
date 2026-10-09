import { PhysSyntaxError } from './types.ts';
import { settingsToTry, startValues } from './scene.ts';
import type { CheckOptions, ParseResult, Scene } from './scene.ts';
import type { KindDef } from './kinds.ts';
import { PLANNED_KINDS, SCENE_KINDS, kindDef, registerKind } from './kinds.ts';
import type { Problem } from './types.ts';
import { list, makeCtx, statements, suggest } from './core.ts';

/** Slider settings that are left out fall back to each slider's starting value. */
function withDefaults(scene: Scene): void {
  const run = scene.run.bind(scene);
  const verify = scene.verify?.bind(scene);
  scene.run = (values) => run({ ...startValues(scene), ...values });
  if (verify) scene.verify = (values) => verify({ ...startValues(scene), ...values });
}

export { registerKind };

/**
 * Reads the text of a ```phys block into a Scene. The first line says which kind: `scene mechanics`, `scene wave`...
 * `parsePhys` never throws: it returns the scene (when there are no mistakes) and every problem it found.
 * `parse` throws a PhysSyntaxError instead. `check` returns just the problems, and also tries the scene at the
 * start and ends of every slider to make sure it holds together.
 */
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
  if (!kind) ctx.problem(first.line, `say which scene: scene ${SCENE_KINDS[0]}`);
  else if (!kindDef(kind) && PLANNED_KINDS.includes(kind)) ctx.problem(first.line, `the "${kind}" scene is planned but not available yet. Available now: ${list(SCENE_KINDS)}`);
  else if (!kindDef(kind)) ctx.problem(first.line, `I don't know a "${kind}" scene.${suggest(kind, [...SCENE_KINDS, ...PLANNED_KINDS])} Available now: ${list(SCENE_KINDS)}`);
  if (ctx.problems.length) return { scene: null, problems: sorted() };

  const rest = stmts.slice(1);
  for (const s of rest) if (s.command === 'scene') ctx.problem(s.line, 'only one "scene" line, and it comes first');
  const scene = (kindDef(kind as string) as KindDef).parse(ctx, rest.filter((s) => s.command !== 'scene'));
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
  for (const setting of settingsToTry(scene)) {
    const run = scene.run(setting.values);
    if (!run.ok) {
      // point at the slider that was moved, so the author knows which line to change
      out.push({ line: setting.moved[0]?.line ?? 1, message: `${run.problem ?? 'this scene breaks'} (found with ${setting.words})` });
      break;
    }
    const more = scene.verify?.(setting.values) ?? [];
    if (more.length) { out.push(...more.map((m) => ({ ...m, message: setting.moved.length ? `${m.message} (found with ${setting.words})` : m.message }))); break; }
  }
  return out;
}
