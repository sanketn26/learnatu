import { mountRunner, showProblems } from '@learnatu/runner-core/dom';
import type { Mounted } from '@learnatu/runner-core/dom';
import { parseTsrun } from './parse.ts';
import { typescriptSandbox } from './sandbox.ts';
import { TYPESCRIPT_BASE } from './types.ts';

/**
 * Browser side: turns the text of a tsrun block into an editor with Run, Stop and Reset (the editor itself is shared
 * with other languages, in @learnatu/runner-core). Import from "@learnatu/tsrun/dom". Needs a DOM.
 * The TypeScript compiler is not downloaded until a reader presses Run for the first time. All blocks on a page share one sandbox.
 */
export interface MountOptions {
  idPrefix?: string;
  /** Where the compiler is loaded from (it must end in "/"). Default: the jsDelivr copy of the TypeScript package. */
  typescriptBase?: string;
}
export type { Mounted };

const STATUS_WORDS = {
  'loading-typescript': 'Loading the TypeScript compiler (about 2 MB, only the first time)…',
  checking: 'Checking types…',
  running: 'Running…'
};

export function mountTsrun(container: HTMLElement, source: string, options: MountOptions = {}): Mounted {
  const { block, problems } = parseTsrun(source);
  if (!block) return showProblems(container, 'This TypeScript block has a mistake', problems, source);
  const base = options.typescriptBase ?? TYPESCRIPT_BASE;
  return mountRunner(container, {
    key: `tsrun:${base}`,
    sandbox: typescriptSandbox(base),
    block,
    render: block.mode === 'render' ? block.size : undefined,
    request: { typecheck: block.typecheck, strict: block.strict, mode: block.mode, width: block.size.width, height: block.size.height },
    statusWords: STATUS_WORDS,
    editorLabel: 'TypeScript code'
  });
}
