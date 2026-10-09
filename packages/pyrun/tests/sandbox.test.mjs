import test from 'node:test';
import assert from 'node:assert/strict';
import { sandboxDocument, contentSecurityPolicy, pythonSandbox, PYODIDE_BASE, WORKER_SOURCE } from '../src/index.ts';

test('the Python sandbox reaches only the Pyodide address, and may run WebAssembly', () => {
  const csp = contentSecurityPolicy(PYODIDE_BASE);
  assert.match(csp, /connect-src https:\/\/cdn\.jsdelivr\.net(;|$)/);
  assert.match(csp, /wasm-unsafe-eval/);
  assert.deepEqual(pythonSandbox().origins, ['https://cdn.jsdelivr.net']);
  assert.ok(sandboxDocument(PYODIDE_BASE).includes(csp));
  assert.equal(pythonSandbox().workerSource, WORKER_SOURCE);
});
