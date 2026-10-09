import { SyntaxProblems } from '@learnatu/textmap-core';
import type { Problem } from '@learnatu/textmap-core';
export type { Problem };

/** Where the TypeScript compiler (and its standard library files) is loaded from. Change the version here to move every lesson. */
export const TYPESCRIPT_VERSION = '5.9.3';
export const TYPESCRIPT_BASE = `https://cdn.jsdelivr.net/npm/typescript@${TYPESCRIPT_VERSION}/lib/`;

/** What an author may ask for, and the largest they may ask. */
export const LIMITS = {
  /** Characters of code in one block. */
  code: 20_000,
  /** Seconds the code may run (not counting the time it takes to load the compiler). */
  timeout: { min: 1, max: 60, default: 10 },
  /** The picture area (render mode): each side in pixels. 1000 x 1000 is the most the page accepts back as raw pixels. */
  size: { min: 40, max: 1000, default: { width: 600, height: 300 } }
} as const;

/** One runnable block, as the author wrote it. */
export interface Block {
  /** The code the reader sees and edits (the `//@` lines are not part of it). */
  code: string;
  title?: string;
  /** Seconds. */
  timeout: number;
  /** The reader may run the code but not change it. */
  readonly: boolean;
  /** Report type mistakes and refuse to run until they are fixed. When off, the code is only stripped of its types and run. */
  typecheck: boolean;
  /** Use strict type checking (strictNullChecks, noImplicitAny...). */
  strict: boolean;
  /** 'run' prints with console.log. 'render' also gets `render(html)` and a `canvas` to draw on, shown below the code. */
  mode: 'run' | 'render';
  /** The size of the picture area, and of the canvas, in pixels. Only for render mode. */
  size: { width: number; height: number };
}

export class TsrunSyntaxError extends SyntaxProblems {
  constructor(problems: Problem[]) { super(problems, 'TsrunSyntaxError'); }
}
