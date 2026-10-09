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
