/**
 * The page that goes inside the sandboxed iframe. Three layers keep a lesson's code away from the reader's account:
 *
 *   1. The iframe is created with sandbox="allow-scripts" and never allow-same-origin, so it gets an opaque origin:
 *      no cookies, no storage, no reading of the lesson page, no calling the site's own API as the reader.
 *   2. This page carries its own Content-Security-Policy: it may load scripts and data only from the addresses the
 *      language names (where its runtime comes from) and run its own blob workers. Every other address is refused.
 *   3. The code runs in a Web Worker, so the lesson page stays responsive and a run that never ends can be
 *      stopped by terminating the worker.
 *
 * The iframe only forwards messages between the page and the worker.
 */
export interface SandboxSpec {
  /** Handed to the worker as `init.base`: where the language's runtime files live (ends in "/"). */
  base: string;
  /** The worker program, as text. It starts when the first message arrives. */
  workerSource: string;
  /** The only web addresses the sandbox may reach (origins, like https://cdn.jsdelivr.net). */
  origins: string[];
  /** The runtime is WebAssembly (needs 'wasm-unsafe-eval'). */
  wasm?: boolean;
}

export function contentSecurityPolicy(spec: Pick<SandboxSpec, 'origins' | 'wasm'>): string {
  const origins = spec.origins.join(' ');
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${spec.wasm ? "'wasm-unsafe-eval' " : ''}blob: ${origins}`,
    'worker-src blob:',
    `connect-src ${origins}`
  ].join('; ');
}

/** Text that is safe to put inside a <script> element. */
const forScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function sandboxDocument(spec: SandboxSpec): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(spec)}"></head><body><script>
(function () {
  var BASE = ${forScript(spec.base)};
  var SOURCE = ${forScript(spec.workerSource)};
  var worker = null;
  function up(message) { parent.postMessage(message, '*'); }
  function start() {
    worker = new Worker(URL.createObjectURL(new Blob([SOURCE], { type: 'text/javascript' })));
    worker.onmessage = function (event) { up(event.data); };
    worker.onerror = function (event) { up({ type: 'crash', message: event && event.message ? event.message : 'The worker stopped.' }); };
    worker.postMessage({ type: 'init', base: BASE });
  }
  addEventListener('message', function (event) {
    if (event.source !== parent) return;
    var message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'kill') { if (worker) worker.terminate(); worker = null; return; }
    if (!worker) start();
    worker.postMessage(message);
  });
  up({ type: 'ready' });
})();
</script></body></html>`;
}
