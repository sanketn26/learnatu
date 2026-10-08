/**
 * @learnatu/flowmap: animated block diagrams of data flow from a small text language.
 *
 *   import { parse, check, renderSvg } from '@learnatu/flowmap';
 *   const diagram = parse(text);          // throws FlowSyntaxError with every mistake and its line
 *   const svg = renderSvg(diagram);       // an SVG string
 *   check(text);                          // [] when fine, otherwise [{ line, message }]
 *
 * In a browser, `mountFlowmap(element, text)` from '@learnatu/flowmap/dom' adds the controls.
 * The library never decides what is a problem: single points of failure and chokepoints are what the author wrote.
 */
export { parse, parseFlow, check } from './parse.ts';
export type { ParseResult } from './parse.ts';
export { renderSvg, describe } from './render.ts';
export type { RenderOptions } from './render.ts';
export { layout, rankNodes } from './layout.ts';
export type { Layout, LayoutNode, LayoutEdge, LayoutGroup } from './layout.ts';
export { findEdge, groupChain, nodesDownWhenFailing, subLabel } from './model.ts';
export { tokenize } from './tokenize.ts';
export { FlowSyntaxError, NODE_KINDS, GROUP_KINDS } from './types.ts';
export type { Diagram, FlowNode, FlowEdge, FlowGroup, Flow, FlowHop, Mark, WhatIf, Problem, NodeKind, GroupKind, Direction, Speed } from './types.ts';
