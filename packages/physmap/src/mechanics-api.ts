/** The parts of the mechanics scene, for tests and for code that wants the raw numbers. Import from "@learnatu/physmap/mechanics". */
import { PhysSyntaxError } from './types.ts';
import type { Model } from './types.ts';
import { makeCtx, statements } from './core.ts';
import { parseMechanics } from './mechanics-parse.ts';

/** The mechanics model for a `scene mechanics` block. Throws PhysSyntaxError when the text has mistakes. */
export function parseModel(source: string): Model {
  const ctx = makeCtx();
  const stmts = statements(source, ctx.problems).filter((s) => s.command !== 'scene');
  const model = parseMechanics(ctx, stmts);
  if (!model || ctx.problems.length) throw new PhysSyntaxError(ctx.problems);
  return model;
}
export { simulate, startParams, PLANETS } from './mechanics-sim.ts';
export { renderSvg, describe, captionAt, seriesValue } from './mechanics-render.ts';
export type { Model, Simulation, Sample } from './types.ts';
