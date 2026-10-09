/**
 * The program that runs inside the Web Worker: it loads Pyodide, runs one block at a time, and reports back with
 * messages (see FromSandbox in types.ts). It is kept as text because the sandbox starts it from a blob, which
 * keeps the whole thing in one file with no server route and no build step.
 *
 * It is plain JavaScript with no template strings, so it can be read and tested as it is. `init` carries the
 * address of Pyodide; nothing else in here knows about the page.
 */
export const WORKER_SOURCE = String.raw`
'use strict';
var pyodide = null;
var booting = null;
var loaded = {};
var queue = Promise.resolve();

function send(message) { self.postMessage(message); }

var HELPER = [
  'import json, sys, traceback',
  '_shared = {"__name__": "__main__"}',
  'def _pyrun(code, shared, reset):',
  '    try:',
  '        return _pyrun_inner(code, shared, reset)',
  '    finally:',
  '        sys.stdout.flush()',
  '        sys.stderr.flush()',
  'def _pyrun_inner(code, shared, reset):',
  '    global _shared',
  '    if reset: _shared = {"__name__": "__main__"}',
  '    namespace = _shared if shared else {"__name__": "__main__"}',
  '    try:',
  '        compiled = compile(code, "<block>", "exec")',
  '        exec(compiled, namespace)',
  '    except SystemExit:',
  '        return "null"',
  '    except BaseException as error:',
  '        tb = error.__traceback__.tb_next if error.__traceback__ else None',
  '        line = None',
  '        for frame in traceback.extract_tb(tb):',
  '            if frame.filename == "<block>": line = frame.lineno',
  '        if isinstance(error, SyntaxError) and error.filename == "<block>": line = error.lineno',
  '        text = "".join(traceback.format_exception(type(error), error, tb)).replace("File \\"<block>\\"", "Your code")',
  '        return json.dumps({"kind": type(error).__name__, "message": str(error).replace("<block>", "your code"), "line": line, "traceback": text})',
  '    return "null"'
].join('\n');

function boot(base) {
  if (booting) return booting;
  booting = (async function () {
    importScripts(base + 'pyodide.js');
    pyodide = await loadPyodide({ indexURL: base });
    pyodide.runPython(HELPER);
  })();
  return booting;
}

/** Hands Python's output to the page exactly as written, byte by byte (so print(end='') does not gain a newline). */
function writer(id, stream) {
  var decoder = new TextDecoder();
  return function (bytes) {
    var text = decoder.decode(bytes, { stream: true });
    if (text) send({ type: 'out', id: id, stream: stream, text: text });
    return bytes.length;
  };
}

async function run(request, base) {
  var id = request.id;
  var stdin = request.stdin.slice();
  try {
    if (!pyodide) { send({ type: 'status', id: id, text: 'loading-python' }); await boot(base); }
    var wanted = request.packages.filter(function (name) { return !loaded[name]; });
    if (wanted.length) {
      send({ type: 'status', id: id, text: 'loading-packages' });
      await pyodide.loadPackage(wanted, { messageCallback: function () {}, errorCallback: function () {} });
      wanted.forEach(function (name) { loaded[name] = true; });
    }
    pyodide.setStdout({ write: writer(id, 'stdout') });
    pyodide.setStderr({ write: writer(id, 'stderr') });
    // like a terminal, show the answer after the prompt
    pyodide.setStdin({ stdin: function () {
      if (!stdin.length) return null;
      var line = stdin.shift();
      send({ type: 'out', id: id, stream: 'stdout', text: line + '\n' });
      return line;
    } });
    send({ type: 'status', id: id, text: 'running' });
    var result = pyodide.globals.get('_pyrun')(request.code, request.shared, request.reset === true);
    var error = JSON.parse(result);
    send(error ? { type: 'done', id: id, error: error } : { type: 'done', id: id });
  } catch (problem) {
    send({ type: 'crash', id: id, message: String(problem && problem.message ? problem.message : problem) });
  }
}

var base = null;
self.onmessage = function (event) {
  var message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.type === 'init') { base = String(message.base); return; }
  if (message.type === 'reset') { queue = queue.then(function () { if (pyodide) pyodide.globals.get('_pyrun')('', true, true); }); return; }
  if (message.type === 'run' && base) queue = queue.then(function () { return run(message, base); });
};
`;
