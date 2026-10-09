import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { WORKER_SOURCE } from '../src/index.ts';

/**
 * Runs the worker program with a stand-in for Pyodide, to check the messages it sends. (The real Python runs in the
 * browser; PYRUN_PYODIDE=/path/to/node_modules/pyodide/ also runs the last test against the real thing.)
 */
function rig(loadPyodide) {
  const sent = [];
  const self = { postMessage: (m) => sent.push(m) };
  const loaded = [];
  const ctx = vm.createContext({ self, importScripts: (url) => loaded.push(url), loadPyodide, TextDecoder, JSON, Promise, String });
  vm.runInContext(WORKER_SOURCE, ctx);
  const send = (m) => self.onmessage({ data: m });
  const settled = async (pred) => { for (let i = 0; i < 200 && !sent.some(pred); i++) await new Promise((r) => setTimeout(r, 5)); return sent.slice(); };
  return { sent, send, loaded, settled };
}
const fakePyodide = (result = 'null') => {
  const calls = [];
  const py = {
    runPython: () => {}, loadPackage: async (names) => { calls.push(['load', names]); },
    setStdout(o) { py.stdout = o; }, setStderr(o) { py.stderr = o; }, setStdin(o) { py.stdin = o; },
    globals: { get: () => (code, shared, reset) => { calls.push(['run', code, shared, reset]); py.stdout.write(new TextEncoder().encode('hi\n')); return result; } }
  };
  return { py, calls, load: async () => py };
};

test('it waits for init, loads Python once, and reports status, output and done', async () => {
  const fake = fakePyodide();
  const r = rig(fake.load);
  r.send({ type: 'run', id: 1, code: 'print("hi")', packages: [], stdin: [], shared: false }); // before init: ignored
  r.send({ type: 'init', base: 'https://example.test/py/' });
  r.send({ type: 'run', id: 2, code: 'print("hi")', packages: ['numpy'], stdin: ['a'], shared: true });
  const msgs = await r.settled((m) => m.type === 'done');
  assert.deepEqual(r.loaded, ['https://example.test/py/pyodide.js']);
  assert.deepEqual(msgs.map((m) => m.type + (m.text ? ':' + m.text : '')), ['status:loading-python', 'status:loading-packages', 'status:running', 'out:hi\n', 'done']);
  assert.ok(msgs.every((m) => m.id === 2));
  assert.deepEqual(fake.calls, [['load', ['numpy']], ['run', 'print("hi")', true, false]]);
  assert.equal(fake.py.stdin.stdin(), 'a');
  assert.equal(r.sent.at(-1).text, 'a\n'); // the answer is shown after the prompt
  assert.equal(fake.py.stdin.stdin(), null);
});

test('a Python error is passed on; a failure to start Python is a crash', async () => {
  const bad = rig(fakePyodide(JSON.stringify({ kind: 'NameError', message: 'm', line: 1, traceback: 't' })).load);
  bad.send({ type: 'init', base: 'b/' });
  bad.send({ type: 'run', id: 1, code: 'x', packages: [], stdin: [], shared: false });
  const done = (await bad.settled((m) => m.type === 'done')).find((m) => m.type === 'done');
  assert.equal(done.error.kind, 'NameError');

  const broken = rig(async () => { throw new Error('network down'); });
  broken.send({ type: 'init', base: 'b/' });
  broken.send({ type: 'run', id: 1, code: 'x', packages: [], stdin: [], shared: false });
  const crash = (await broken.settled((m) => m.type === 'crash')).find((m) => m.type === 'crash');
  assert.match(crash.message, /network down/);
});

test('with PYRUN_PYODIDE set, real Python runs the block', { skip: !process.env.PYRUN_PYODIDE }, async () => {
  const { createRequire } = await import('node:module');
  const { loadPyodide } = createRequire(import.meta.url)(process.env.PYRUN_PYODIDE);
  const r = rig(loadPyodide);
  r.send({ type: 'init', base: process.env.PYRUN_PYODIDE.replace(/\/?$/, '/') });
  r.send({ type: 'run', id: 1, code: 'print(sum(n * n for n in range(4)))', packages: [], stdin: [], shared: false });
  const msgs = await r.settled((m) => m.type === 'done' || m.type === 'crash');
  assert.deepEqual(msgs.filter((m) => m.type === 'out').map((m) => m.text), ['14\n']);
});
