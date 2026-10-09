import { SyntaxProblems } from '@learnatu/textmap-core';
import type { Problem } from '@learnatu/textmap-core';
export type { Problem };

/** Where Pyodide (Python compiled to WebAssembly) is loaded from. Change `PYODIDE_VERSION` here to move every lesson. */
export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** What an author may ask for, and the largest they may ask. */
export const LIMITS = {
  /** Characters of code in one block. */
  code: 20_000,
  /** Seconds the code may run (not counting the time it takes to load Python). */
  timeout: { min: 1, max: 60, default: 10 },
  /** Characters of output kept; past this the run is stopped. */
  output: 200_000,
  stdinLines: 50
} as const;

/** Packages a block may load with `#@ packages`. Everything is fetched from the Pyodide CDN, never from PyPI. */
export const PACKAGES = ['numpy', 'pandas', 'scipy', 'sympy', 'networkx'] as const;

/** One runnable block, as the author wrote it. */
export interface Block {
  /** The code the reader sees and edits (the `#@` lines are not part of it). */
  code: string;
  title?: string;
  /** Seconds. */
  timeout: number;
  packages: string[];
  /** Lines handed to `input()`, in order. */
  stdin: string[];
  /** The reader may run the code but not change it. */
  readonly: boolean;
  /** Runs in one namespace shared by every `shared` block on the page, like cells in a notebook. Otherwise each run starts clean. */
  shared: boolean;
}

export class PyrunSyntaxError extends SyntaxProblems {
  constructor(problems: Problem[]) { super(problems, 'PyrunSyntaxError'); }
}

// ---- messages between the page and the sandbox. Everything coming back from the sandbox is untrusted data. ----

export interface RunRequest { type: 'run'; id: number; code: string; packages: string[]; stdin: string[]; shared: boolean }
export type ToSandbox = RunRequest | { type: 'kill' } | { type: 'reset' };

export interface RunError {
  /** "NameError", "SyntaxError"... */
  kind: string;
  message: string;
  /** Line in the code the reader sees, when Python gave one. */
  line?: number;
  /** The traceback, trimmed to the reader's own code. */
  traceback: string;
}
export type FromSandbox =
  | { type: 'status'; id: number; text: 'loading-python' | 'loading-packages' | 'running' }
  | { type: 'out'; id: number; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'done'; id: number; error?: RunError }
  | { type: 'crash'; id?: number; message: string };

/** How a run ended, as the page reports it. */
export type Outcome = 'ok' | 'error' | 'timeout' | 'stopped' | 'too-much-output' | 'crashed';
export interface RunResult { outcome: Outcome; error?: RunError; message?: string }
