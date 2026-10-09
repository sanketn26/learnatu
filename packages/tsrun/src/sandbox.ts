import type { SandboxSpec } from '@learnatu/runner-core';
import { WORKER_SOURCE } from './worker-source.ts';
import { TYPESCRIPT_BASE } from './types.ts';

/** The sandbox for TypeScript: it may reach only the address the compiler is loaded from. No WebAssembly is needed. */
export function typescriptSandbox(base: string = TYPESCRIPT_BASE, workerSource: string = WORKER_SOURCE): SandboxSpec {
  return { base, workerSource, origins: [new URL(base).origin] };
}
