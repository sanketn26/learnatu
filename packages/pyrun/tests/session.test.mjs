import test from 'node:test';
import assert from 'node:assert/strict';
import { Session, readMessage, sandboxDocument, contentSecurityPolicy, PYODIDE_BASE, LIMITS } from '../src/index.ts';

function rig() {
  const posted = [];
  let listener = () => {};
  const timers = [];
  const channel = { post: (m) => posted.push(m), onMessage: (l) => { listener = l; } };
  const fake = { set: (fn, ms) => { const t = { fn, ms, live: true }; timers.push(t); return t; }, clear: (t) => { t.live = false; } };
  const session = new Session(channel, fake);
  const emit = (m) => listener(m);
  const fire = (ms) => timers.filter((t) => t.live && t.ms === ms).forEach((t) => { t.live = false; t.fn(); });
  return { session, posted, emit, fire, timers };
}
const block = { code: 'print(1)', timeout: 5, packages: [], stdin: [], shared: false };

test('a run sends the code, streams output and finishes ok', async () => {
  const { session, posted, emit } = rig();
  const seen = [];
  const done = session.run(block, { output: (s, t) => seen.push([s, t]), status: (t) => seen.push(t) });
  assert.equal(posted[0].type, 'run');
  assert.equal(posted[0].code, 'print(1)');
  const id = posted[0].id;
  emit({ type: 'status', id, text: 'running' });
  emit({ type: 'out', id, stream: 'stdout', text: '1\n' });
  emit({ type: 'done', id });
  assert.deepEqual(await done, { outcome: 'ok' });
  assert.deepEqual(seen, ['running', ['stdout', '1\n']]);
  assert.equal(session.busy, false);
});

test('an error from Python comes back with its line', async () => {
  const { session, posted, emit } = rig();
  const done = session.run(block);
  const id = posted[0].id;
  emit({ type: 'done', id, error: { kind: 'NameError', message: "name 'x' is not defined", line: 3, traceback: 'Your code, line 3' } });
  const r = await done;
  assert.equal(r.outcome, 'error');
  assert.equal(r.error.line, 3);
});

test('the time limit starts when the code starts running, and kills the worker', async () => {
  const { session, posted, emit, fire, timers } = rig();
  const done = session.run({ ...block, timeout: 2 });
  const id = posted[0].id;
  assert.ok(timers.some((t) => t.live && t.ms === 90_000), 'loading has its own long limit');
  assert.ok(!timers.some((t) => t.live && t.ms === 2000), 'the block limit has not started yet');
  emit({ type: 'status', id, text: 'running' });
  assert.ok(timers.some((t) => t.live && t.ms === 2000));
  assert.ok(!timers.some((t) => t.live && t.ms === 90_000), 'the loading limit is cleared');
  fire(2000);
  const r = await done;
  assert.equal(r.outcome, 'timeout');
  assert.deepEqual(posted.at(-1), { type: 'kill' });
});

test('too much output stops the run', async () => {
  const { session, posted, emit } = rig();
  const done = session.run(block);
  const id = posted[0].id;
  emit({ type: 'out', id, stream: 'stdout', text: 'x'.repeat(LIMITS.output + 1) });
  assert.equal((await done).outcome, 'too-much-output');
  assert.deepEqual(posted.at(-1), { type: 'kill' });
});

test('starting a new run stops the old one, and old messages are ignored', async () => {
  const { session, posted, emit } = rig();
  const first = session.run(block);
  const firstId = posted[0].id;
  const second = session.run(block);
  assert.equal((await first).outcome, 'stopped');
  const secondId = posted.filter((p) => p.type === 'run').at(-1).id;
  emit({ type: 'out', id: firstId, stream: 'stdout', text: 'late' });
  emit({ type: 'done', id: secondId });
  assert.deepEqual(await second, { outcome: 'ok' });
});

test('stop() ends the run; a crash ends it as crashed', async () => {
  const a = rig();
  const stopped = a.session.run(block);
  a.session.stop();
  assert.equal((await stopped).outcome, 'stopped');
  const b = rig();
  const crashed = b.session.run(block);
  b.emit({ type: 'crash', message: 'out of memory' });
  const r = await crashed;
  assert.equal(r.outcome, 'crashed');
  assert.equal(r.message, 'out of memory');
});

test('messages from the sandbox are checked, not trusted', () => {
  assert.equal(readMessage(null), null);
  assert.equal(readMessage('hi'), null);
  assert.equal(readMessage({ type: 'out', id: 1, stream: 'stdin', text: 'x' }), null);
  assert.equal(readMessage({ type: 'out', id: '1', stream: 'stdout', text: 'x' }), null);
  assert.equal(readMessage({ type: 'status', id: 1, text: 'exploding' }), null);
  assert.equal(readMessage({ type: 'done', id: 1, error: { kind: 1 } }), null);
  assert.equal(readMessage({ type: 'launch-missiles' }), null);
  assert.deepEqual(readMessage({ type: 'done', id: 1, error: { kind: 'E', message: 'm', traceback: 't', line: 2, extra: 'dropped' } }), { type: 'done', id: 1, error: { kind: 'E', message: 'm', traceback: 't', line: 2 } });
});

test('the sandbox page can only reach the Pyodide address', () => {
  const csp = contentSecurityPolicy(PYODIDE_BASE);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /connect-src https:\/\/cdn\.jsdelivr\.net(;|$)/);
  assert.match(csp, /worker-src blob:/);
  assert.doesNotMatch(csp, /\*/);
  const html = sandboxDocument(PYODIDE_BASE);
  assert.ok(html.includes(csp));
  // the worker text is embedded safely, however it is written
  const evil = sandboxDocument(PYODIDE_BASE, 'x = "</script><script>alert(1)</script>"');
  assert.equal((evil.match(/<\/script>/g) ?? []).length, 1);
});
