/**
 * @learnatu/tsrun: runnable TypeScript in a lesson, from a ```tsrun block.
 *
 *   import { parse, check } from '@learnatu/tsrun';
 *   const block = parse(text);     // throws TsrunSyntaxError with every mistake and its line
 *   check(text);                   // [] when fine, otherwise [{ line, message }]
 *
 * In a browser, `mountTsrun(element, text)` from '@learnatu/tsrun/dom' adds the editor and the Run button. The code is
 * type-checked (the real TypeScript compiler, in the reader's browser), turned into JavaScript and run in a sandboxed
 * iframe and worker with a time limit. Nothing is sent to our servers and nothing the code does can reach the
 * reader's account. The run/sandbox/editor machinery is shared with other languages: see @learnatu/runner-core.
 */
export { parse, parseTsrun, check } from './parse.ts';
export type { ParseResult } from './parse.ts';
export { typescriptSandbox } from './sandbox.ts';
export { WORKER_SOURCE } from './worker-source.ts';
export { RUNTIME_SOURCE } from './runtime-source.ts';
export { LIMITS, TYPESCRIPT_BASE, TYPESCRIPT_VERSION, TsrunSyntaxError } from './types.ts';
export type { Block, Problem } from './types.ts';
