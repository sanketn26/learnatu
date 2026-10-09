/**
 * The program text that runs first inside the worker that executes a reader's compiled code. It replaces `console`
 * and the timers so the page can see what the code prints and tell when it has finished, and it knows how to show a
 * value the way a terminal would. The reader's code follows it, wrapped in an async function so top-level await works;
 * when that function ends it calls __finished(), or __fail() if it threw.
 *
 * It is the text of one function, installed with `(` + RUNTIME_SOURCE + `)();`. Plain JavaScript, no template strings.
 */
export const RUNTIME_SOURCE = String.raw`function (options) {
  'use strict';
  options = options || {};
  var post = function (message, transfer) { self.postMessage(message, transfer || []); };
  var seen = [];

  function show(value, depth) {
    if (typeof value === 'string') return depth === 0 ? value : "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    if (typeof value === 'bigint') return String(value) + 'n';
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return '[Function: ' + (value.name || 'anonymous') + ']';
    if (value === null || typeof value !== 'object') return String(value);
    if (value instanceof Error) return value.stack ? String(value.stack) : value.name + ': ' + value.message;
    if (value instanceof Date) return isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
    if (value instanceof RegExp) return String(value);
    if (seen.indexOf(value) >= 0) return '[Circular]';
    if (depth > 3) return Array.isArray(value) ? '[Array]' : '[Object]';
    seen.push(value);
    try {
      var parts = [];
      if (Array.isArray(value)) {
        for (var i = 0; i < Math.min(value.length, 100); i++) parts.push(i in value ? show(value[i], depth + 1) : '<empty>');
        if (value.length > 100) parts.push('... ' + (value.length - 100) + ' more items');
        return parts.length ? '[ ' + parts.join(', ') + ' ]' : '[]';
      }
      if (value instanceof Map) {
        value.forEach(function (v, k) { parts.push(show(k, depth + 1) + ' => ' + show(v, depth + 1)); });
        return 'Map(' + value.size + ') { ' + parts.join(', ') + ' }';
      }
      if (value instanceof Set) {
        value.forEach(function (v) { parts.push(show(v, depth + 1)); });
        return 'Set(' + value.size + ') { ' + parts.join(', ') + ' }';
      }
      var keys = Object.keys(value);
      for (var k = 0; k < Math.min(keys.length, 100); k++) {
        var key = keys[k];
        var shown;
        try { shown = show(value[key], depth + 1); } catch (problem) { shown = '[Throws]'; }
        parts.push((/^[A-Za-z_$][\w$]*$/.test(key) ? key : "'" + key + "'") + ': ' + shown);
      }
      var name = value.constructor && value.constructor.name && value.constructor.name !== 'Object' ? value.constructor.name + ' ' : '';
      return parts.length ? name + '{ ' + parts.join(', ') + ' }' : name + '{}';
    } finally { seen.pop(); }
  }

  function line(args) { return Array.prototype.map.call(args, function (a) { return show(a, 0); }).join(' ') + '\n'; }
  var out = function (stream) { return function () { post({ k: 'out', stream: stream, text: line(arguments) }); }; };
  self.console = {
    log: out('stdout'), info: out('stdout'), debug: out('stdout'), dir: out('stdout'), table: out('stdout'),
    warn: out('stderr'), error: out('stderr'),
    assert: function (ok) { if (!ok) post({ k: 'out', stream: 'stderr', text: 'Assertion failed' + (arguments.length > 1 ? ': ' + line(Array.prototype.slice.call(arguments, 1)) : '\n') }); }
  };

  // Timers are counted so we can tell when nothing more can happen. An interval that is never cleared keeps the run
  // going until the time limit, which is what a reader who forgot clearInterval should see.
  var pending = {};
  var count = 0;
  var rawSet = self.setTimeout.bind(self), rawSetInterval = self.setInterval.bind(self);
  var rawClear = self.clearTimeout.bind(self), rawClearInterval = self.clearInterval.bind(self);
  self.setTimeout = function (fn, ms) {
    var rest = Array.prototype.slice.call(arguments, 2);
    var id = rawSet(function () { if (pending[id]) { delete pending[id]; count--; } fn.apply(self, rest); }, ms);
    pending[id] = true; count++;
    return id;
  };
  self.setInterval = function (fn, ms) {
    var rest = Array.prototype.slice.call(arguments, 2);
    var id = rawSetInterval(function () { fn.apply(self, rest); }, ms);
    pending[id] = true; count++;
    return id;
  };
  var clear = function (raw) { return function (id) { if (pending[id]) { delete pending[id]; count--; } raw(id); }; };
  self.clearTimeout = clear(rawClear);
  self.clearInterval = clear(rawClearInterval);

  // The line (of the generated JavaScript) an error came from, read from its stack.
  function lineOf(error) {
    var text = error && error.stack ? String(error.stack) : '';
    var m = /(?:blob:[^\s)]*|<anonymous>|[^\s(]*\.js):(\d+):\d+/.exec(text);
    return m ? Number(m[1]) : undefined;
  }
  function describe(r) { return { name: r && r.name ? String(r.name) : 'Error', message: r && r.message !== undefined ? String(r.message) : show(r, 0), line: lineOf(r) }; }
  self.addEventListener('unhandledrejection', function (event) {
    var d = describe(event.reason);
    post({ k: 'error', name: d.name, message: d.message, line: d.line });
  });
  // Called when the reader's code throws (or rejects) on its way through: the run ends there.
  self.__fail = function (error) {
    var d = describe(error);
    post({ k: 'error', name: d.name, message: d.message, line: d.line });
  };

  // Render mode: render(html) shows markup, and canvas is a drawing surface whose pixels are sent back at the end.
  // Nothing here can run code on the page: only text and raw pixels leave this worker.
  var surface = null;
  if (options.mode === 'render') {
    self.render = function (html) { post({ k: 'render', html: String(html) }); };
    var sheet = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(options.width, options.height) : null;
    self.canvas = {
      width: options.width, height: options.height,
      getContext: function (type) {
        if (type !== '2d') throw new TypeError("canvas.getContext only supports '2d'");
        if (!sheet) throw new Error('Drawing is not available in this browser.');
        surface = surface || sheet.getContext('2d');
        return surface;
      }
    };
  }
  function sendPicture() {
    if (!surface) return;
    var pixels = surface.getImageData(0, 0, options.width, options.height).data.buffer;
    post({ k: 'image', width: options.width, height: options.height, data: pixels }, [pixels]);
  }

  // Called after the reader's code has run to its end: wait until no timer is left, then say so.
  self.__finished = function () {
    var turns = 0;
    (function wait() {
      rawSet(function () {
        if (count > 0) { turns = 0; wait(); return; }
        if (++turns < 3) { wait(); return; } // a few more turns for promise chains to settle
        sendPicture();
        post({ k: 'finished' });
      }, 0);
    })();
  };
}`;
