import { mountRunner, showProblems } from '@learnatu/runner-core/dom';
import type { Mounted } from '@learnatu/runner-core/dom';
import { parsePyrun } from './parse.ts';
import { pythonSandbox } from './sandbox.ts';
import { PYODIDE_BASE } from './types.ts';

/**
 * Browser side: turns the text of a pyrun block into an editor with Run, Stop and Reset (the editor itself is shared
 * with other languages, in @learnatu/runner-core). Import from "@learnatu/pyrun/dom". Needs a DOM.
 * Python is not downloaded until a reader presses Run for the first time. All blocks on a page share one sandbox.
 */
export interface MountOptions {
  idPrefix?: string;
  /** Where Pyodide is loaded from (it must end in "/"). Default: the Pyodide CDN. */
  pyodideBase?: string;
}
export type { Mounted };

const STATUS_WORDS = {
  'loading-python': 'Loading Python (about 10 MB, only the first time)…',
  'loading-packages': 'Loading packages…',
  running: 'Running…'
};

export function mountPyrun(container: HTMLElement, source: string, options: MountOptions = {}): Mounted {
  const { block, problems } = parsePyrun(source);
  if (!block) return showProblems(container, 'This Python block has a mistake', problems, source);
  const base = options.pyodideBase ?? PYODIDE_BASE;
  return mountRunner(container, {
    key: `pyrun:${base}`,
    sandbox: pythonSandbox(base),
    block,
    request: { packages: block.packages, stdin: block.stdin, shared: block.shared },
    statusWords: STATUS_WORDS,
    editorLabel: 'Python code'
  });
}
