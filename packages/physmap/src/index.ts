/**
 * @learnatu/physmap: visual physics scenes (bodies, forces, springs, motion over time) from a small text language.
 *
 *   import { parse, check, simulate, renderSvg } from '@learnatu/physmap';
 *   const model = parse(text);              // throws PhysSyntaxError with every mistake and its line
 *   const sim = simulate(model, { k: 60 }); // run it, with the sliders at the given values (SI units)
 *   const svg = renderSvg(model, sim, 120); // the picture at sample 120 (sample 0 is the start)
 *   check(text);                            // [] when fine, otherwise [{ line, message }]
 *
 * In a browser, `mountPhysmap(element, text)` from '@learnatu/physmap/dom' adds Play, a time slider and the sliders
 * the author declared. Units are checked: adding a length to a time is a mistake with a line number, not a wrong picture.
 */
export { parse, parsePhys, check } from './parse.ts';
export type { ParseResult, CheckOptions } from './parse.ts';
export { simulate, startParams, PLANETS } from './sim.ts';
export { renderSvg, describe, captionAt, seriesValue } from './render.ts';
export type { RenderOptions } from './render.ts';
export { tokenize } from './tokenize.ts';
export { parseQuantity, parseUnit, dimName, dimSymbol } from './units.ts';
export { PhysSyntaxError } from './types.ts';
export type { Model, Simulation, Sample, Param, Body, Link, Plot, Note, Predict, Problem, Dim, Val } from './types.ts';
