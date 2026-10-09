import { contentSecurityPolicy as csp, sandboxDocument as page } from '@learnatu/runner-core';
import type { SandboxSpec } from '@learnatu/runner-core';
import { WORKER_SOURCE } from './worker-source.ts';
import { PYODIDE_BASE } from './types.ts';

/** The sandbox for Python: it may reach only the Pyodide address, and runs WebAssembly. */
export function pythonSandbox(base: string = PYODIDE_BASE, workerSource: string = WORKER_SOURCE): SandboxSpec {
  return { base, workerSource, origins: [new URL(base).origin], wasm: true };
}

export const contentSecurityPolicy = (base: string): string => csp(pythonSandbox(base));
export const sandboxDocument = (base: string, workerSource?: string): string => page(pythonSandbox(base, workerSource));
