/**
 * @learnatu/algomap: step-by-step diagrams of algorithms on arrays, lists, trees and graphs, from a small text language.
 *
 *   import { parse, check, renderSvg } from '@learnatu/algomap';
 *   const diagram = parse(text);          // throws AlgoSyntaxError with every mistake and its line
 *   const svg = renderSvg(diagram, 2);    // the SVG of frame 2 (frame 0 is the start)
 *   check(text);                          // [] when fine, otherwise [{ line, message }]
 *
 * In a browser, `mountAlgomap(element, text)` from '@learnatu/algomap/dom' adds Previous / Play / Next and a slider.
 * The library never runs an algorithm: every frame is exactly what the author wrote under each `step`.
 */
export { parse, parseAlgo, check } from './parse.ts';
export type { ParseResult } from './parse.ts';
export { renderSvg, describe } from './render.ts';
export type { RenderOptions } from './render.ts';
export { layout } from './layout.ts';
export type { Layout, StructLayout } from './layout.ts';
export { tokenize } from '@learnatu/textmap-core';
export { AlgoSyntaxError, STRUCT_KINDS } from './types.ts';
export { PAINTS } from './types.ts';
export type { Diagram, Structure, StructState, Frame, Flash, Kept, Paint, NTree, Problem, StructKind, GraphEdge } from './types.ts';
