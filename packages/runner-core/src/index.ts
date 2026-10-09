/**
 * @learnatu/runner-core: what the runnable-code packages share.
 *   - `Session`: one run at a time, a time limit that starts when the code starts running, an output cap, and
 *     ignoring old or malformed messages from the sandbox.
 *   - `sandboxDocument`: the page inside the sandboxed iframe, with its Content-Security-Policy.
 *   - `mountRunner` (from '@learnatu/runner-core/dom'): the editor with Run, Stop and Reset.
 * A language (pyrun, tsrun) adds its options, its worker program, and the words for its status messages.
 */
export { Session, readMessage } from './session.ts';
export type { Channel, RunHandlers, Timers } from './session.ts';
export { sandboxDocument, contentSecurityPolicy } from './sandbox.ts';
export type { SandboxSpec } from './sandbox.ts';
export { OUTPUT_LIMIT, LOADING_MS } from './types.ts';
export type { FromSandbox, ToSandbox, RunRequest, RunError, RunResult, Outcome } from './types.ts';
