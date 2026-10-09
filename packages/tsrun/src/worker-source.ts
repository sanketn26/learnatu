import { RENDER_SHIM } from './render-shim.ts';
import { RUNTIME_SOURCE } from './runtime-source.ts';

/**
 * The program that runs inside the Web Worker: it loads the TypeScript compiler, checks the reader's code, turns it
 * into JavaScript, and runs it in a fresh nested worker (so every run starts clean and a run that never ends can be
 * thrown away). It reports with messages (see FromSandbox in @learnatu/runner-core). Kept as text because the sandbox
 * starts it from a blob. Plain JavaScript with no template strings, so it can be read and tested as it is.
 */
const BODY = String.raw`
'use strict';
var ts = null;
var booting = null;
var libs = {};
var libsReady = null;
var queue = Promise.resolve();
var runner = null;
var base = null;

function send(message, transfer) { self.postMessage(message, transfer || []); }

// What a worker does not have but the reader's code can expect, so it type-checks like a small Node program.
var SHIM = [
  'declare var console: { log(...data: any[]): void; info(...data: any[]): void; debug(...data: any[]): void; dir(data: any): void; table(data: any): void; warn(...data: any[]): void; error(...data: any[]): void; assert(condition?: boolean, ...data: any[]): void };',
  'declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;',
  'declare function clearTimeout(id?: number): void;',
  'declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;',
  'declare function clearInterval(id?: number): void;',
  'declare function queueMicrotask(callback: () => void): void;',
  'declare function structuredClone<T>(value: T): T;',
  'declare var performance: { now(): number };'
].join('\n');

function boot() {
  if (booting) return booting;
  booting = (async function () { importScripts(base + 'typescript.js'); ts = self.ts || ts; })();
  return booting;
}

function loadLib(name) {
  if (libs[name] !== undefined) return Promise.resolve();
  libs[name] = '';
  return fetch(base + name).then(function (response) {
    if (!response.ok) throw new Error('Could not load ' + name);
    return response.text();
  }).then(function (text) {
    libs[name] = text;
    var refs = [];
    var pattern = /\/\/\/\s*<reference\s+lib="([^"]+)"\s*\/>/g;
    var match;
    while ((match = pattern.exec(text))) refs.push('lib.' + match[1].toLowerCase() + '.d.ts');
    return Promise.all(refs.map(loadLib));
  });
}

function ensureLibs() {
  if (!libsReady) libsReady = loadLib('lib.es2022.d.ts');
  return libsReady;
}

function options(strict) {
  return { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleDetection: ts.ModuleDetectionKind.Force, strict: strict, noEmit: true, skipLibCheck: true, types: [] };
}

/** The mistakes the compiler finds in the reader's code: [{ line, column, code, text }], at most 20. */
function diagnose(code, strict, mode) {
  var files = { 'main.ts': code, 'shim.d.ts': mode === 'render' ? SHIM + '\n' + RENDER_SHIM : SHIM };
  var bare = function (name) { return name.replace(/^.*\//, ''); };
  var host = {
    getSourceFile: function (name, language) {
      var text = files[name];
      if (text === undefined) text = libs[bare(name)];
      return text === undefined ? undefined : ts.createSourceFile(name, text, language);
    },
    getDefaultLibFileName: function () { return 'lib.es2022.d.ts'; },
    writeFile: function () {},
    getCurrentDirectory: function () { return ''; },
    getDirectories: function () { return []; },
    fileExists: function (name) { return files[name] !== undefined || libs[bare(name)] !== undefined; },
    readFile: function (name) { return files[name] !== undefined ? files[name] : libs[bare(name)]; },
    getCanonicalFileName: function (name) { return name; },
    useCaseSensitiveFileNames: function () { return true; },
    getNewLine: function () { return '\n'; }
  };
  var program = ts.createProgram({ rootNames: ['main.ts', 'shim.d.ts'], options: options(strict), host: host });
  var source = program.getSourceFile('main.ts');
  var found = program.getSyntacticDiagnostics(source).concat(program.getSemanticDiagnostics(source));
  return found.slice(0, 20).map(function (d) {
    var at = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : null;
    return { line: at ? at.line + 1 : undefined, column: at ? at.character + 1 : undefined, code: d.code, text: ts.flattenDiagnosticMessageText(d.messageText, '\n') };
  });
}

/** JavaScript for the reader's code, and a map from its lines back to the reader's lines. */
function compile(code) {
  var result = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleDetection: ts.ModuleDetectionKind.Force, sourceMap: true } });
  return { js: result.outputText.replace(/\/\/# sourceMappingURL=.*$/m, ''), map: result.sourceMapText };
}

var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** The line of the reader's code that produced line 'generated' (1-based) of the JavaScript, or undefined. */
function originalLine(mapText, generated) {
  try {
    var rows = JSON.parse(mapText).mappings.split(';');
    var sourceLine = 0, best;
    for (var r = 0; r < rows.length && r < generated; r++) {
      var field = 0, value = 0, shift = 0, fields = [];
      var segments = rows[r] ? rows[r].split(',') : [];
      for (var s = 0; s < segments.length; s++) {
        fields = [];
        value = 0; shift = 0;
        for (var c = 0; c < segments[s].length; c++) {
          var digit = B64.indexOf(segments[s][c]);
          value += (digit & 31) << shift;
          if (digit & 32) { shift += 5; continue; }
          fields.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0; shift = 0;
        }
        if (fields.length >= 4) { sourceLine += fields[2]; if (r === generated - 1 && best === undefined) best = sourceLine + 1; }
      }
    }
    return best !== undefined ? best : (sourceLine ? sourceLine + 1 : undefined);
  } catch (problem) { return undefined; }
}

function describeError(text) {
  var m = /^(?:Uncaught\s+)?(?:([A-Za-z]*Error|[A-Za-z]*Exception)\s*:\s*)?([\s\S]*)$/.exec(String(text || ''));
  return { kind: (m && m[1]) || 'Error', message: ((m && m[2]) || String(text)).trim() };
}

// The reader's JavaScript starts two lines after the runtime's last line: one for the line that opens the async wrapper
// (so top-level await works), one because the runtime is followed by a line break.
var RUNTIME_LINES = RUNTIME.split('\n').length + 1;

/** Runs the compiled code in a fresh worker. Resolves with an error (or nothing) when the code has finished. */
function execute(compiled, id, mode, width, height) {
  return new Promise(function (resolve) {
    if (typeof Worker === 'undefined') { resolve({ kind: 'Error', message: 'This browser cannot run TypeScript here (it needs workers inside workers).', traceback: '' }); return; }
    // A classic worker: a module worker made from a blob does not start inside the sandbox's opaque origin.
    var js = compiled.js.replace(/^export \{\};?[ \t]*$/m, '');
    if (/^\s*(import|export)\b/m.test(js)) { resolve({ kind: 'Error', message: 'import and export are not available in a lesson block. Write everything in the one block.', traceback: '' }); return; }
    var source = '(' + RUNTIME + ')(' + JSON.stringify({ mode: mode, width: width, height: height }) + ');\n(async () => { \'use strict\';\n' + js + '\n})().then(self.__finished, self.__fail);';
    var url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    var worker = new Worker(url);
    runner = worker;
    var finish = function (error) { if (runner === worker) runner = null; worker.terminate(); URL.revokeObjectURL(url); resolve(error); };
    var fail = function (kind, message, generatedLine) {
      var line = generatedLine ? originalLine(compiled.map, generatedLine - RUNTIME_LINES) : undefined;
      finish({ kind: kind, message: message, line: line, traceback: kind + ': ' + message + (line ? '\n  at your code, line ' + line : '') });
    };
    worker.onmessage = function (event) {
      var m = event.data || {};
      if (m.k === 'out') send({ type: 'out', id: id, stream: m.stream === 'stderr' ? 'stderr' : 'stdout', text: String(m.text) });
      else if (m.k === 'render') send({ type: 'render', id: id, html: String(m.html) });
      else if (m.k === 'image') send({ type: 'render', id: id, image: { width: m.width, height: m.height, data: m.data } }, [m.data]);
      else if (m.k === 'finished') finish();
      else if (m.k === 'error') fail(String(m.name), String(m.message), typeof m.line === 'number' ? m.line : undefined);
    };
    worker.onerror = function (event) {
      if (event.preventDefault) event.preventDefault();
      var e = describeError(event.message);
      fail(e.kind, e.message, event.lineno);
    };
  });
}

async function run(request) {
  var id = request.id;
  try {
    if (!ts) { send({ type: 'status', id: id, text: 'loading-typescript' }); await boot(); }
    if (request.typecheck) {
      send({ type: 'status', id: id, text: 'checking' });
      await ensureLibs();
      var problems = diagnose(request.code, request.strict !== false, request.mode);
      if (problems.length) {
        var first = problems[0];
        var text = problems.map(function (p) { return (p.line ? 'line ' + p.line + ':' + p.column + ' ' : '') + 'TS' + p.code + ': ' + p.text; }).join('\n');
        send({ type: 'done', id: id, error: { kind: 'TypeScript', message: first.text, line: first.line, traceback: text } });
        return;
      }
    }
    var compiled = compile(request.code);
    send({ type: 'status', id: id, text: 'running' });
    var error = await execute(compiled, id, request.mode, request.width, request.height);
    send(error ? { type: 'done', id: id, error: error } : { type: 'done', id: id });
  } catch (problem) {
    send({ type: 'crash', id: id, message: String(problem && problem.message ? problem.message : problem) });
  }
}

self.onmessage = function (event) {
  var message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.type === 'init') { base = String(message.base); return; }
  if (message.type === 'run' && base) queue = queue.then(function () { return run(message); });
};
`;

export const WORKER_SOURCE = `var RUNTIME = ${JSON.stringify(RUNTIME_SOURCE)};\nvar RENDER_SHIM = ${JSON.stringify(RENDER_SHIM)};\n${BODY}`;
