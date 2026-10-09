/** Limits every language shares. Per-block limits (time) are set by the author within the range a language allows. */
export const OUTPUT_LIMIT = 200_000;
/** The longest a language may take to load (Python, a compiler, packages). */
export const LOADING_MS = 90_000;
/** Longest a status word may be; anything longer coming out of the sandbox is dropped. */
export const STATUS_MAX = 40;

// ---- messages between the page and the sandbox. Everything coming back from the sandbox is untrusted data. ----

/** `code` and `id` are always there. A language adds whatever else its worker needs (packages, input, options). */
export interface RunRequest { type: 'run'; id: number; code: string; [option: string]: unknown }
export type ToSandbox = RunRequest | { type: 'kill' } | { type: 'reset' };

export interface RunError {
  /** "NameError", "TypeError", "TypeScript"... */
  kind: string;
  message: string;
  /** Line in the code the reader sees, when there is one. */
  line?: number;
  /** More detail, trimmed to the reader's own code. */
  traceback: string;
}
export type FromSandbox =
  | { type: 'status'; id: number; text: string }
  | { type: 'out'; id: number; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'done'; id: number; error?: RunError }
  | { type: 'crash'; id?: number; message: string };

/** How a run ended, as the page reports it. */
export type Outcome = 'ok' | 'error' | 'timeout' | 'stopped' | 'too-much-output' | 'crashed';
export interface RunResult { outcome: Outcome; error?: RunError; message?: string }
