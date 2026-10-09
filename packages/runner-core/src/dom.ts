import { sandboxDocument } from './sandbox.ts';
import type { SandboxSpec } from './sandbox.ts';
import { Session } from './session.ts';
import type { RenderedImage, RunResult } from './types.ts';

/**
 * Browser side, shared by every language: an editor with Run, Stop and Reset, the output, and the one hidden sandbox
 * iframe per language on the page. Import from "@learnatu/runner-core/dom". Needs a DOM.
 * The runtime (Python, the TypeScript compiler) is not downloaded until a reader presses Run for the first time.
 */
export interface Mounted { destroy(): void }

export interface RunnerSpec {
  /** One sandbox is shared by every block with the same key. */
  key: string;
  sandbox: SandboxSpec;
  block: { title?: string; code: string; readonly: boolean; timeout: number };
  /** Show a picture area under the editor, this big (CSS pixels), for code that draws or produces HTML. */
  render?: { width: number; height: number };
  /** Sent to the worker with every run, besides the code (packages, input, options...). */
  request: Record<string, unknown>;
  /** What to show for each status word the worker reports. */
  statusWords: Record<string, string>;
  /** For screen readers: what the editor is. */
  editorLabel: string;
}

const CSS = `
.rn-figure{margin:1.5rem 0;border:1px solid var(--rn-line,var(--tm-line,var(--line,#dfe8e3)));border-radius:1.2rem;background:var(--rn-card,var(--tm-card,var(--surface,#fff)));overflow:hidden;color:var(--rn-ink,var(--tm-ink,var(--ink,#17332e)));font:15px/1.5 system-ui,sans-serif}
.rn-title{margin:0;padding:.6rem 1rem;font-weight:700;border-bottom:1px solid var(--rn-line,var(--tm-line,var(--line,#dfe8e3)))}
.rn-code{display:block;width:100%;box-sizing:border-box;margin:0;padding:.8rem 1rem;border:0;resize:vertical;background:transparent;color:inherit;font:.88rem/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;tab-size:4;white-space:pre;overflow:auto}
.rn-code:focus-visible{outline:2px solid var(--rn-brand,var(--tm-brand,var(--brand,#0b8f7a)));outline-offset:-2px}
pre.rn-code{overflow:auto}
.rn-bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.6rem .9rem;border-top:1px solid var(--rn-line,var(--tm-line,var(--line,#dfe8e3)))}
.rn-bar button{font:600 .88rem system-ui,sans-serif;min-height:2.4rem;padding:0 .95rem;border-radius:999px;border:1.5px solid var(--rn-line,var(--tm-line,var(--line,#dfe8e3)));background:var(--rn-card,var(--tm-card,var(--surface,#fff)));color:inherit;cursor:pointer}
.rn-bar button:disabled{opacity:.45;cursor:default}
.rn-bar .rn-main{background:var(--rn-ink,var(--tm-ink,var(--ink,#17332e)));color:var(--rn-card,var(--tm-card,var(--surface,#fff)));border-color:transparent;min-width:5.6rem}
.rn-status{font-size:.84rem;opacity:.75}
.rn-render{padding:.7rem 1rem;border-top:1px solid var(--rn-line,var(--tm-line,var(--line,#dfe8e3)));background:var(--rn-card,var(--tm-card,var(--surface,#fff)))}
.rn-render[hidden]{display:none}
.rn-render iframe{display:block;width:100%;border:0;background:#fff;border-radius:.5rem}
.rn-render canvas{display:block;max-width:100%;height:auto;border-radius:.5rem;background:#fff}
.rn-out{margin:0;padding:.7rem 1rem;border-top:1px solid var(--rn-line,var(--tm-line,var(--line,#dfe8e3)));font:.85rem/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere;min-height:2.6rem;max-height:20rem;overflow:auto}
.rn-out:empty::before{content:"No output yet";opacity:.5;font-family:system-ui,sans-serif}
.rn-err{color:var(--rn-bad,var(--tm-bad,var(--bad,#c2314f)))}
.rn-note{margin:0;padding:.6rem 1rem;border-top:1px solid var(--rn-line,var(--tm-line,var(--line,#dfe8e3)));font-size:.9rem;background:color-mix(in srgb,var(--rn-bad,var(--tm-bad,var(--bad,#c2314f))) 10%,transparent)}
.rn-note[hidden]{display:none}
.rn-note summary{cursor:pointer}
.rn-note pre{margin:.5rem 0 0;white-space:pre-wrap;font:.8rem/1.5 ui-monospace,monospace}
.rn-error{margin:1.5rem 0;padding:1rem 1.2rem;border:1.5px solid var(--rn-bad,var(--tm-bad,var(--bad,#c2314f)));border-radius:1rem;font-size:.92rem}
.rn-error pre{margin:.6rem 0 0;overflow:auto;white-space:pre-wrap;font:.82rem/1.5 ui-monospace,monospace}
`;

function injectStyles() {
  if (document.getElementById('rn-dom-style')) return;
  const style = document.createElement('style');
  style.id = 'rn-dom-style';
  style.textContent = CSS;
  document.head.append(style);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const DROP = ['script', 'meta', 'base', 'link', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'audio', 'video', 'source', 'track', 'portal', 'template', 'noscript'];
const ADDRESSES = ['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'srcset', 'data', 'ping'];

/**
 * HTML from a run, made safe to show: no scripts, no frames or forms, no <meta> (a refresh could send the frame to
 * another site), no event handlers, and no address that points anywhere but inside the picture (#id) or at an
 * inline image. The frame it goes into also has no scripts, a policy that allows nothing but inline styles and
 * data: images, and no permissions, so this is a second lock, not the only one.
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}`, 'text/html');
  doc.querySelectorAll(DROP.join(',')).forEach((node) => node.remove());
  doc.body.querySelectorAll('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      // browsers ignore control characters and spaces inside an address, so compare without them
      const value = Array.from(attribute.value).filter((c) => c.charCodeAt(0) > 32).join('').toLowerCase();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      else if (ADDRESSES.includes(name) && !(value.startsWith('#') || /^data:image\/(png|jpeg|gif|webp);/.test(value))) node.removeAttribute(attribute.name);
      else if (name === 'style' && /url\(|@import|expression\(/i.test(attribute.value)) node.removeAttribute(attribute.name);
    }
  });
  doc.querySelectorAll('style').forEach((node) => { if (/@import|url\(/i.test(node.textContent ?? '')) node.remove(); });
  return doc.body.innerHTML;
}

/** What a block shows when its text has mistakes. */
export function showProblems(container: HTMLElement, heading: string, problems: { line: number; message: string }[], source: string): Mounted {
  injectStyles();
  const box = el('div', 'rn-error');
  box.setAttribute('role', 'alert');
  box.append(el('strong', undefined, heading));
  const list = el('ul');
  problems.forEach((p) => list.append(el('li', undefined, `line ${p.line}: ${p.message}`)));
  box.append(list, el('pre', undefined, source));
  container.replaceChildren(box);
  return { destroy() {} };
}

// ---- one sandbox per language for the whole page, made the first time someone presses Run ----

const sessions = new Map<string, Session>();

function sessionFor(key: string, spec: SandboxSpec): Session {
  const existing = sessions.get(key);
  if (existing) return existing;
  const frame = document.createElement('iframe');
  // No allow-same-origin: the frame gets an opaque origin, with no cookies, no storage and no reach into this page.
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.hidden = true;
  frame.title = 'Code sandbox';
  frame.srcdoc = sandboxDocument(spec);
  document.body.append(frame);
  const listeners: ((message: unknown) => void)[] = [];
  window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow) return; // only our own frame
    listeners.forEach((l) => l(event.data));
  });
  // Messages sent before the frame has loaded are held until it says it is ready.
  let ready = false;
  const waiting: unknown[] = [];
  listeners.push((m) => {
    if (!ready && m && typeof m === 'object' && (m as { type?: unknown }).type === 'ready') {
      ready = true;
      waiting.splice(0).forEach((w) => frame.contentWindow?.postMessage(w, '*'));
    }
  });
  const session = new Session({
    post: (message) => { if (ready) frame.contentWindow?.postMessage(message, '*'); else waiting.push(message); },
    onMessage: (listener) => { listeners.push(listener); }
  });
  sessions.set(key, session);
  return session;
}

export function mountRunner(container: HTMLElement, spec: RunnerSpec): Mounted {
  injectStyles();
  const view = new View(container, spec);
  return { destroy: () => view.destroy() };
}

class View {
  private spec: RunnerSpec;
  private code: HTMLTextAreaElement | HTMLPreElement;
  private out = el('pre', 'rn-out');
  private note = el('details', 'rn-note');
  private pane = el('div', 'rn-render');
  private status = el('span', 'rn-status');
  private run = el('button', 'rn-main', 'Run');
  private stop = el('button', undefined, 'Stop');
  private reset = el('button', undefined, 'Reset');
  private session: Session | null = null;
  private running = false;
  private gone = false;

  constructor(container: HTMLElement, spec: RunnerSpec) {
    this.spec = spec;
    const { block } = spec;
    const figure = el('figure', 'rn-figure');
    if (block.title) figure.append(el('p', 'rn-title', block.title));
    if (block.readonly) {
      this.code = el('pre', 'rn-code');
      this.code.textContent = block.code;
      this.code.tabIndex = 0;
    } else {
      const area = el('textarea', 'rn-code');
      area.value = block.code;
      area.rows = Math.min(Math.max(block.code.split('\n').length, 3), 22);
      area.spellcheck = false;
      area.autocapitalize = 'off';
      area.setAttribute('autocomplete', 'off');
      area.setAttribute('aria-label', `${spec.editorLabel}. Press Control or Command and Enter to run it.`);
      area.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void this.start(); } });
      this.code = area;
    }
    this.run.type = this.stop.type = this.reset.type = 'button';
    this.stop.hidden = true;
    this.status.setAttribute('role', 'status');
    this.out.setAttribute('aria-live', 'polite');
    this.out.setAttribute('aria-label', 'Output');
    this.note.hidden = true;
    this.run.addEventListener('click', () => void this.start());
    this.stop.addEventListener('click', () => this.session?.stop());
    this.reset.addEventListener('click', () => {
      if (this.code instanceof HTMLTextAreaElement) this.code.value = block.code;
      this.out.replaceChildren();
      this.note.hidden = true;
      this.status.textContent = '';
    });
    const bar = el('div', 'rn-bar');
    bar.append(this.run, this.stop);
    if (!block.readonly) bar.append(this.reset);
    bar.append(this.status);
    this.pane.hidden = true;
    this.pane.setAttribute('aria-label', 'What the code drew');
    figure.append(this.code, bar);
    if (spec.render) figure.append(this.pane);
    figure.append(this.out, this.note);
    container.replaceChildren(figure);
  }

  private text(): string { return this.code instanceof HTMLTextAreaElement ? this.code.value : this.spec.block.code; }

  private async start() {
    if (this.running || this.gone) return;
    this.running = true;
    this.session ??= sessionFor(this.spec.key, this.spec.sandbox);
    this.out.replaceChildren();
    this.pane.replaceChildren();
    this.pane.hidden = true;
    this.note.hidden = true;
    this.run.disabled = true;
    this.stop.hidden = false;
    const result = await this.session.run({ ...this.spec.request, code: this.text(), timeout: this.spec.block.timeout }, {
      render: (drawing) => this.draw(drawing),
      status: (s) => { this.status.textContent = this.spec.statusWords[s] ?? ''; },
      output: (stream, text) => {
        if (stream === 'stderr') this.out.append(el('span', 'rn-err', text));
        else this.out.append(document.createTextNode(text));
      }
    });
    this.running = false;
    this.run.disabled = false;
    this.stop.hidden = true;
    if (!this.gone) this.finish(result);
  }

  /** Shows what the code drew. HTML goes in a frame that cannot run scripts, load anything or leave the box. */
  private draw(drawing: { html?: string; image?: RenderedImage }) {
    const size = this.spec.render;
    if (!size) return;
    this.pane.hidden = false;
    this.pane.replaceChildren();
    if (drawing.html !== undefined) {
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', ''); // no scripts, no forms, no navigation, no same-origin
      frame.title = 'What the code drew';
      frame.style.height = `${size.height}px`;
      frame.srcdoc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><body style="margin:0;font:15px/1.5 system-ui,sans-serif">${sanitizeHtml(drawing.html)}`;
      this.pane.append(frame);
    } else if (drawing.image) {
      const { width, height, data } = drawing.image;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'A picture drawn by the code');
      canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
      this.pane.append(canvas);
    }
  }

  private finish(result: RunResult) {
    this.status.textContent = result.outcome === 'ok' ? 'Finished.' : '';
    if (result.outcome === 'ok') return;
    this.note.hidden = false;
    this.note.replaceChildren();
    if (result.error) {
      const where = result.error.line ? `Line ${result.error.line}: ` : '';
      this.note.append(el('summary', undefined, `${where}${result.error.kind}: ${result.error.message}`), el('pre', undefined, result.error.traceback));
      this.note.open = true;
    } else {
      this.note.append(el('summary', undefined, result.message ?? 'The run did not finish.'));
    }
  }

  destroy() {
    this.gone = true;
    if (this.running) this.session?.stop();
  }
}
