import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { WORKER_SOURCE, RUNTIME_SOURCE, typescriptSandbox, TYPESCRIPT_BASE } from '../src/index.ts';

/**
 * Runs the worker with the real TypeScript compiler (from node_modules, so no network) and a stand-in for the nested
 * worker that executes the compiled code. The real nested worker, line numbers and the sandbox are checked in a browser.
 */
const require = createRequire(import.meta.url);
const tsDir = path.dirname(require.resolve('typescript/lib/typescript.js'));

function rig() {
  const sent = [];
  const self = { postMessage: (m) => sent.push(m) };
  class FakeWorker {
    constructor(url, options) {
      this.url = url; this.options = options;
      const source = FakeWorker.sources.get(url);
      // in a real worker `self` is the global scope, so the code's `console` is the one the runtime replaced
      const inside = { postMessage: (data) => setImmediate(() => this.onmessage?.({ data })), addEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Map, Set, Date, Error, Array, Object, String, JSON, RegExp, Math };
      inside.self = inside;
      const ctx = vm.createContext(inside);
      const body = source.replace(/^export \{\};?\s*$/m, '');
      setImmediate(() => {
        vm.runInContext(`(async () => {\n${body}\n})().catch((e) => self.__fail(e));`, ctx);
      });
      inside.__fail = (e) => this.onerror?.({ message: 'Uncaught ' + (e && e.name ? e.name + ': ' + e.message : e), lineno: 0, preventDefault() {} });
    }
    terminate() {}
  }
  FakeWorker.sources = new Map();
  // blob text is async, so hand the worker a synchronous Blob stand-in
  class SyncBlob { constructor(parts) { this.t = parts.join(''); } text() { return Promise.resolve(this.t); } }
  const urls = { createObjectURL: (blob) => { const key = 'blob:' + FakeWorker.sources.size; FakeWorker.sources.set(key, blob.t); return key; }, revokeObjectURL() {} };
  const fetchLocal = async (url) => {
    const file = path.join(tsDir, url.replace(TYPESCRIPT_BASE, ''));
    return fs.existsSync(file) ? { ok: true, text: async () => fs.readFileSync(file, 'utf8') } : { ok: false };
  };
  const ctx = vm.createContext({
    self, Worker: FakeWorker, Blob: SyncBlob, URL: urls, fetch: fetchLocal, Promise, JSON, String, RegExp, Object, Array, Error,
    importScripts: (url) => { assert.equal(url, TYPESCRIPT_BASE + 'typescript.js'); ctx.ts = require('typescript'); self.ts = ctx.ts; }
  });
  vm.runInContext(WORKER_SOURCE, ctx);
  const send = (m) => self.onmessage({ data: m });
  send({ type: 'init', base: TYPESCRIPT_BASE });
  const settled = async () => { for (let i = 0; i < 400 && !sent.some((m) => m.type === 'done' || m.type === 'crash'); i++) await new Promise((r) => setTimeout(r, 10)); return sent.slice(); };
  return { send, sent, settled };
}
const req = (code, extra = {}) => ({ type: 'run', id: 1, code, typecheck: true, strict: true, ...extra });

test('good code is checked, run, and its console output comes back', async () => {
  const r = rig();
  r.send(req('const n: number = 6;\nconsole.log("n is", n * 7, [1, "a"], { ok: true });'));
  const msgs = await r.settled();
  assert.deepEqual(msgs.map((m) => m.type + (m.text ? ':' + m.text : '')), ['status:loading-typescript', 'status:checking', 'status:running', 'out:n is 42 [ 1, \'a\' ] { ok: true }\n', 'done']);
  assert.equal(msgs.at(-1).error, undefined);
});

test('type mistakes stop the run and say which line', async () => {
  const r = rig();
  r.send(req('const a = 1;\nconst n: number = "six";\nconsole.log(n);'));
  const msgs = await r.settled();
  const done = msgs.at(-1);
  assert.equal(done.type, 'done');
  assert.equal(done.error.kind, 'TypeScript');
  assert.equal(done.error.line, 2);
  assert.match(done.error.message, /Type 'string' is not assignable to type 'number'/);
  assert.match(done.error.traceback, /line 2:\d+ TS2322/);
  assert.ok(!msgs.some((m) => m.type === 'status' && m.text === 'running'), 'it did not run');
});

test('strict off allows what strict forbids; typecheck off skips checking', async () => {
  const code = 'function f(x) { return x; }\nconsole.log(f(1));';
  const strict = rig(); strict.send(req(code));
  assert.equal((await strict.settled()).at(-1).error.kind, 'TypeScript'); // implicit any
  const loose = rig(); loose.send(req(code, { strict: false }));
  assert.equal((await loose.settled()).at(-1).error, undefined);
  const off = rig(); off.send(req('const n: number = "six";\nconsole.log(n);', { typecheck: false }));
  const msgs = await off.settled();
  assert.ok(!msgs.some((m) => m.type === 'status' && m.text === 'checking'));
  assert.deepEqual(msgs.filter((m) => m.type === 'out').map((m) => m.text), ['six\n']);
});

test('the runtime shows values like a terminal', async () => {
  const sent = [];
  const self = { postMessage: (m) => sent.push(m), addEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval };
  const ctx = vm.createContext({ self, Array, Object, Map, Set, Date, Error, RegExp, String, Math, Promise });
  vm.runInContext(`(${RUNTIME_SOURCE})()`, ctx);
  const circular = { name: 'loop' }; circular.me = circular;
  self.console.log('a', 1, 2n, null, undefined, true, 'x');
  self.console.log([1, [2, [3, [4, [5]]]]], new Map([[1, 'a']]), new Set([1]), circular, () => 1, Symbol('s'));
  self.console.error('bad');
  assert.deepEqual(sent.map((m) => m.text), [
    "a 1 2n null undefined true x\n",
    "[ 1, [ 2, [ 3, [ 4, [Array] ] ] ] ] Map(1) { 1 => 'a' } Set(1) { 1 } { name: 'loop', me: [Circular] } [Function: anonymous] Symbol(s)\n",
    'bad\n'
  ]);
  assert.equal(sent[2].stream, 'stderr');
});

test('the runtime says it is finished only when no timer is left', async () => {
  const sent = [];
  const self = { postMessage: (m) => sent.push(m), addEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval };
  const ctx = vm.createContext({ self, Array, Object, Map, Set, Date, Error, RegExp, String, Math, Promise });
  vm.runInContext(`(${RUNTIME_SOURCE})()`, ctx);
  self.setTimeout(() => self.console.log('later'), 30);
  const interval = self.setInterval(() => {}, 10);
  self.__finished();
  await new Promise((r) => setTimeout(r, 80));
  assert.ok(!sent.some((m) => m.k === 'finished'), 'an interval is still running');
  self.clearInterval(interval);
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(sent.filter((m) => m.k).map((m) => m.k), ['out', 'finished']);
});

test('the TypeScript sandbox reaches only the compiler address and needs no WebAssembly', async () => {
  const { contentSecurityPolicy } = await import('@learnatu/runner-core');
  const spec = typescriptSandbox();
  assert.deepEqual(spec.origins, ['https://cdn.jsdelivr.net']);
  const csp = contentSecurityPolicy(spec);
  assert.doesNotMatch(csp, /wasm-unsafe-eval|unsafe-eval'/);
  assert.match(csp, /connect-src https:\/\/cdn\.jsdelivr\.net(;|$)/);
});

test('render mode: render() sends HTML and is type-checked; run mode does not know it', async () => {
  const r = rig();
  r.send(req('render("<p>" + (1 + 2) + "</p>");', { mode: 'render', width: 100, height: 50 }));
  const msgs = await r.settled();
  assert.deepEqual(JSON.parse(JSON.stringify(msgs.filter((m) => m.type === 'render'))), [{ type: 'render', id: 1, html: '<p>3</p>' }]);
  assert.equal(msgs.at(-1).error, undefined);

  const plain = rig();
  plain.send(req('render("x");', { mode: 'run' }));
  const done = (await plain.settled()).at(-1);
  assert.equal(done.error.kind, 'TypeScript');
  assert.match(done.error.message, /Cannot find name 'render'/);
});

test('render mode: canvas drawing is type-checked, and its pixels are sent back at the end', async () => {
  const wrong = rig();
  wrong.send(req('const g = canvas.getContext("2d");\ng.fillRect("a", 0, 10, 10);', { mode: 'render', width: 4, height: 2 }));
  assert.match((await wrong.settled()).at(-1).error.message, /not assignable to parameter of type 'number'/);

  // the runtime alone, with a stand-in for the browser's canvas
  const sent = [];
  const self = { postMessage: (m, t) => sent.push([m, t]), addEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval };
  class FakeCanvas { constructor(w, h) { this.w = w; this.h = h; } getContext() { return { fillRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) }) }; } }
  const ctx = vm.createContext({ self, OffscreenCanvas: FakeCanvas, Array, Object, Map, Set, Date, Error, RegExp, String, Math, Promise, Uint8ClampedArray });
  vm.runInContext(`(${RUNTIME_SOURCE})({ mode: 'render', width: 4, height: 2 })`, ctx);
  assert.equal(typeof self.render, 'function');
  self.canvas.getContext('2d').fillRect(0, 0, 4, 2);
  assert.throws(() => self.canvas.getContext('webgl'), /only supports '2d'/);
  self.__finished();
  await new Promise((r) => setTimeout(r, 50));
  const image = sent.find(([m]) => m.k === 'image');
  assert.equal(image[0].width, 4);
  assert.equal(image[0].data.byteLength, 4 * 2 * 4);
  assert.equal(image[1].length, 1, 'the pixels are handed over, not copied');
  assert.deepEqual(sent.map(([m]) => m.k).filter(Boolean), ['image', 'finished']);

  // in run mode there is no canvas and no render
  const quiet = { postMessage() {}, addEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval };
  vm.runInContext(`(${RUNTIME_SOURCE})({ mode: 'run' })`, vm.createContext({ self: quiet, Array, Object, Map, Set, Date, Error, RegExp, String, Math, Promise }));
  assert.equal(quiet.render, undefined);
  assert.equal(quiet.canvas, undefined);
});
