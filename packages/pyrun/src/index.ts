/**
 * @learnatu/pyrun: runnable Python in a lesson, from a ```pyrun block.
 *
 *   import { parse, check } from '@learnatu/pyrun';
 *   const block = parse(text);     // throws PyrunSyntaxError with every mistake and its line
 *   check(text);                   // [] when fine, otherwise [{ line, message }]
 *
 * In a browser, `mountPyrun(element, text)` from '@learnatu/pyrun/dom' adds the editor and the Run button. The code
 * runs on the reader's own device (Pyodide, Python compiled to WebAssembly), in a sandboxed iframe and a worker,
 * with a time limit. Nothing is sent to our servers and nothing the code does can reach the reader's account.
 * Language: README.md.
 */
export { parse, parsePyrun, check } from './parse.ts';
export type { ParseResult } from './parse.ts';
export { Session, readMessage } from './session.ts';
export type { Channel, RunHandlers, Timers } from './session.ts';
export { sandboxDocument, contentSecurityPolicy } from './sandbox.ts';
export { WORKER_SOURCE } from './worker-source.ts';
export { LIMITS, PACKAGES, PYODIDE_BASE, PYODIDE_VERSION, PyrunSyntaxError } from './types.ts';
export type { Block, Problem, FromSandbox, ToSandbox, RunError, RunResult, Outcome } from './types.ts';
