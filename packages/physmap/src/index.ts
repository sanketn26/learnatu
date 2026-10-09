/**
 * @learnatu/physmap: visual physics scenes from a small text language. Eight kinds of scene share one set of rules:
 * every number has a unit (checked), sliders can be declared with `param`, and mistakes come with their line number.
 *
 *   import { parse, check } from '@learnatu/physmap';
 *   const scene = parse(text);                 // throws PhysSyntaxError with every mistake and its line
 *   const run = scene.run({ k: 60 });          // work out the scene for these slider settings (SI units)
 *   run.svg(120);                              // the picture at moment 120 of run.count
 *   check(text);                               // [] when fine, otherwise [{ line, message }]
 *
 * In a browser, `mountPhysmap(element, text)` from '@learnatu/physmap/dom' adds Play, a time slider and the sliders
 * the author declared. Mechanics also exposes its parts (simulate, renderSvg) from '@learnatu/physmap/mechanics'.
 */
export { parse, parsePhys, check, registerKind } from './parse.ts';
export { SCENE_KINDS, KIND_INFO } from './kinds.ts';
export type { KindDef } from './kinds.ts';
export { startValues, extremeValues, settingsToTry } from './scene.ts';
export type { Setting, Scene, Run, SceneKind, KindInfo, Builder, ParseResult, CheckOptions, RenderOptions } from './scene.ts';
export { tokenize } from '@learnatu/textmap-core';
export { parseQuantity, parseUnit, dimName, dimSymbol } from './units.ts';
export { PhysSyntaxError } from './types.ts';
export type { Param, Predict, Problem, Dim, Val } from './types.ts';
export { EXAMPLES } from './examples.ts';
export type { Example } from './examples.ts';
