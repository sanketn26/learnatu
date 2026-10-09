import { parsePyrun } from './parse.ts';
import { sandboxDocument } from './sandbox.ts';
import { Session } from './session.ts';
import { PYODIDE_BASE } from './types.ts';
import type { Block, RunResult } from './types.ts';

/**
 * Browser side: turns the text of a pyrun block into an editor with Run, Stop and Reset.
 *   Import from "@learnatu/pyrun/dom". Needs a DOM; the rest of the package does not.
 * Python is not downloaded until a reader presses Run for the first time. All blocks on a page share one sandbox,
 * so Python loads once.
 */
export interface MountOptions {
  idPrefix?: string;
  /** Where Pyodide is loaded from (it must end in "/"). Default: the Pyodide CDN. */
  pyodideBase?: string;
}
export interface Mounted { destroy(): void }

const CSS = `
.pr-figure{margin:1.5rem 0;border:1px solid var(--pr-line,var(--tm-line,var(--line,#dfe8e3)));border-radius:1.2rem;background:var(--pr-card,var(--tm-card,var(--surface,#fff)));overflow:hidden;color:var(--pr-ink,var(--tm-ink,var(--ink,#17332e)));font:15px/1.5 system-ui,sans-serif}
.pr-title{margin:0;padding:.6rem 1rem;font-weight:700;border-bottom:1px solid var(--pr-line,var(--tm-line,var(--line,#dfe8e3)))}
.pr-code{display:block;width:100%;box-sizing:border-box;margin:0;padding:.8rem 1rem;border:0;resize:vertical;background:transparent;color:inherit;font:.88rem/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;tab-size:4;white-space:pre;overflow:auto}
.pr-code:focus-visible{outline:2px solid var(--pr-brand,var(--tm-brand,var(--brand,#0b8f7a)));outline-offset:-2px}
pre.pr-code{overflow:auto}
.pr-bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.6rem .9rem;border-top:1px solid var(--pr-line,var(--tm-line,var(--line,#dfe8e3)))}
.pr-bar button{font:600 .88rem system-ui,sans-serif;min-height:2.4rem;padding:0 .95rem;border-radius:999px;border:1.5px solid var(--pr-line,var(--tm-line,var(--line,#dfe8e3)));background:var(--pr-card,var(--tm-card,var(--surface,#fff)));color:inherit;cursor:pointer}
.pr-bar button:disabled{opacity:.45;cursor:default}
.pr-bar .pr-main{background:var(--pr-ink,var(--tm-ink,var(--ink,#17332e)));color:var(--pr-card,var(--tm-card,var(--surface,#fff)));border-color:transparent;min-width:5.6rem}
.pr-status{font-size:.84rem;opacity:.75}
.pr-out{margin:0;padding:.7rem 1rem;border-top:1px solid var(--pr-line,var(--tm-line,var(--line,#dfe8e3)));font:.85rem/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere;min-height:2.6rem;max-height:20rem;overflow:auto}
.pr-out:empty::before{content:"No output yet";opacity:.5;font-family:system-ui,sans-serif}
.pr-err{color:var(--pr-bad,var(--tm-bad,var(--bad,#c2314f)))}
.pr-note{margin:0;padding:.6rem 1rem;border-top:1px solid var(--pr-line,var(--tm-line,var(--line,#dfe8e3)));font-size:.9rem;background:color-mix(in srgb,var(--pr-bad,var(--tm-bad,var(--bad,#c2314f))) 10%,transparent)}
.pr-note[hidden]{display:none}
.pr-note summary{cursor:pointer}
.pr-note pre{margin:.5rem 0 0;white-space:pre-wrap;font:.8rem/1.5 ui-monospace,monospace}
.pr-error{margin:1.5rem 0;padding:1rem 1.2rem;border:1.5px solid var(--pr-bad,var(--tm-bad,var(--bad,#c2314f)));border-radius:1rem;font-size:.92rem}
.pr-error pre{margin:.6rem 0 0;overflow:auto;white-space:pre-wrap;font:.82rem/1.5 ui-monospace,monospace}
`;

function injectStyles() {
  if (document.getElementById('pr-dom-style')) return;
  const style = document.createElement('style');
  style.id = 'pr-dom-style';
  style.textContent = CSS;
  document.head.append(style);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---- one sandbox for the whole page, made the first time someone presses Run ----

const sessions = new Map<string, Session>();

function sessionFor(base: string): Session {
  const existing = sessions.get(base);
  if (existing) return existing;
  const frame = document.createElement('iframe');
  // No allow-same-origin: the frame gets an opaque origin, with no cookies, no storage and no reach into this page.
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.hidden = true;
  frame.title = 'Python sandbox';
  frame.srcdoc = sandboxDocument(base);
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
  sessions.set(base, session);
  return session;
}

const STATUS_WORDS = {
  'loading-python': 'Loading Python (about 10 MB, only the first time)…',
  'loading-packages': 'Loading packages…',
  running: 'Running…'
} as const;

export function mountPyrun(container: HTMLElement, source: string, options: MountOptions = {}): Mounted {
  injectStyles();
  const { block, problems } = parsePyrun(source);
  if (!block) {
    const box = el('div', 'pr-error');
    box.setAttribute('role', 'alert');
    box.append(el('strong', undefined, 'This Python block has a mistake'));
    const list = el('ul');
    problems.forEach((p) => list.append(el('li', undefined, `line ${p.line}: ${p.message}`)));
    box.append(list, el('pre', undefined, source));
    container.replaceChildren(box);
    return { destroy() {} };
  }
  const view = new View(container, block, options.pyodideBase ?? PYODIDE_BASE);
  return { destroy: () => view.destroy() };
}

class View {
  private code: HTMLTextAreaElement | HTMLPreElement;
  private out = el('pre', 'pr-out');
  private note = el('details', 'pr-note');
  private status = el('span', 'pr-status');
  private run = el('button', 'pr-main', 'Run');
  private stop = el('button', undefined, 'Stop');
  private reset = el('button', undefined, 'Reset');
  private session: Session | null = null;
  private running = false;
  private gone = false;

  private block: Block;
  private base: string;

  constructor(container: HTMLElement, block: Block, base: string) {
    this.block = block;
    this.base = base;
    const figure = el('figure', 'pr-figure');
    if (block.title) figure.append(el('p', 'pr-title', block.title));
    if (block.readonly) {
      this.code = el('pre', 'pr-code');
      this.code.textContent = block.code;
      this.code.tabIndex = 0;
    } else {
      const area = el('textarea', 'pr-code');
      area.value = block.code;
      area.rows = Math.min(Math.max(block.code.split('\n').length, 3), 22);
      area.spellcheck = false;
      area.autocapitalize = 'off';
      area.setAttribute('autocomplete', 'off');
      area.setAttribute('aria-label', 'Python code. Press Control or Command and Enter to run it.');
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
    const bar = el('div', 'pr-bar');
    bar.append(this.run, this.stop);
    if (!block.readonly) bar.append(this.reset);
    bar.append(this.status);
    figure.append(this.code, bar, this.out, this.note);
    container.replaceChildren(figure);
  }

  private text(): string { return this.code instanceof HTMLTextAreaElement ? this.code.value : this.block.code; }

  private async start() {
    if (this.running || this.gone) return;
    this.running = true;
    this.session ??= sessionFor(this.base);
    this.out.replaceChildren();
    this.note.hidden = true;
    this.run.disabled = true;
    this.stop.hidden = false;
    const result = await this.session.run({ ...this.block, code: this.text() }, {
      status: (s) => { this.status.textContent = STATUS_WORDS[s]; },
      output: (stream, text) => {
        if (stream === 'stderr') this.out.append(el('span', 'pr-err', text));
        else this.out.append(document.createTextNode(text));
      }
    });
    this.running = false;
    this.run.disabled = false;
    this.stop.hidden = true;
    if (!this.gone) this.finish(result);
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
