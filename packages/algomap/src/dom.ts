import { parseAlgo } from './parse.ts';
import { renderSvg } from './render.ts';
import type { Diagram } from './types.ts';

/**
 * Browser side: turns the text of an algo block into a live figure.
 *   Previous / Play / Next buttons, a slider over the steps, and the caption the author wrote for the current step.
 *   Import from "@learnatu/algomap/dom". Needs a DOM; the rest of the package does not.
 */
export interface MountOptions { idPrefix?: string; /** Milliseconds per step while playing. Default 1500. */ interval?: number }

const CSS = `
.am-figure{margin:1.5rem 0;border:1px solid var(--am-line,var(--tm-line,var(--line,#dfe8e3)));border-radius:1.2rem;background:var(--am-card,var(--tm-card,var(--surface,#fff)));overflow:hidden;color:var(--am-ink,var(--tm-ink,var(--ink,#17332e)));font:15px/1.5 system-ui,sans-serif}
.am-figure:focus-visible{outline:2px solid var(--am-brand,var(--tm-brand,var(--brand,#0b8f7a)));outline-offset:2px}
.am-stage{padding:1rem .6rem .4rem;overflow-x:auto;background-image:radial-gradient(color-mix(in srgb,var(--am-muted,var(--tm-muted,var(--muted,#60706c))) 28%,transparent) 1px,transparent 1.2px);background-size:22px 22px}
.am-caption{margin:0;padding:.75rem 1rem;border-top:1px solid var(--am-line,var(--tm-line,var(--line,#dfe8e3)));font-weight:600;min-height:3.2rem}
.am-controls{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.7rem .9rem;border-top:1px solid var(--am-line,var(--tm-line,var(--line,#dfe8e3)))}
.am-controls button{font:600 .88rem system-ui,sans-serif;min-height:2.4rem;padding:0 .95rem;border-radius:999px;border:1.5px solid var(--am-line,var(--tm-line,var(--line,#dfe8e3)));background:var(--am-card,var(--tm-card,var(--surface,#fff)));color:inherit;cursor:pointer}
.am-controls button:disabled{opacity:.4;cursor:default}
.am-controls .am-main{background:var(--am-ink,var(--tm-ink,var(--ink,#17332e)));color:var(--am-card,var(--tm-card,var(--surface,#fff)));border-color:transparent;min-width:5.6rem}
.am-controls input[type=range]{flex:1 1 9rem;min-width:7rem;accent-color:var(--am-brand,var(--tm-brand,var(--brand,#0b8f7a)))}
.am-count{font:600 .82rem ui-monospace,monospace;opacity:.7;white-space:nowrap}
.am-legend{display:flex;flex-wrap:wrap;gap:.3rem 1.1rem;padding:.2rem .9rem .8rem;font-size:.82rem;opacity:.85}
.am-legend span{display:inline-flex;gap:.4rem;align-items:center}.am-legend i{width:.9rem;height:.9rem;border-radius:.25rem;border:2.4px solid}
.am-error{margin:1.5rem 0;padding:1rem 1.2rem;border:1.5px solid var(--am-bad,var(--tm-bad,var(--bad,#c2314f)));border-radius:1rem;font-size:.92rem}
.am-error pre{margin:.6rem 0 0;overflow:auto;white-space:pre-wrap;font:.82rem/1.5 ui-monospace,monospace}
`;

function injectStyles() {
  if (document.getElementById('am-dom-style')) return;
  const style = document.createElement('style');
  style.id = 'am-dom-style';
  style.textContent = CSS;
  document.head.append(style);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let counter = 0;

export function mountAlgomap(container: HTMLElement, source: string, options: MountOptions = {}): void {
  injectStyles();
  const { diagram, problems } = parseAlgo(source);
  if (!diagram) {
    const box = el('div', 'am-error');
    box.setAttribute('role', 'alert');
    box.append(el('strong', undefined, 'This algorithm diagram has a mistake'));
    const list = el('ul');
    problems.forEach((p) => list.append(el('li', undefined, `line ${p.line}: ${p.message}`)));
    box.append(list, el('pre', undefined, source));
    container.replaceChildren(box);
    return;
  }
  new Player(container, diagram, options.idPrefix ?? `am${++counter}`, options.interval ?? 1500);
}

class Player {
  private index = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stage = el('div', 'am-stage');
  private caption = el('p', 'am-caption');
  private prev = el('button', undefined, 'Previous');
  private next = el('button', undefined, 'Next');
  private play = el('button', 'am-main', 'Play');
  private slider = el('input');
  private count = el('span', 'am-count');
  private last: number;

  constructor(container: HTMLElement, private d: Diagram, private id: string, private interval: number) {
    this.last = d.frames.length - 1;
    const figure = el('figure', 'am-figure');
    figure.tabIndex = 0;
    figure.setAttribute('aria-label', 'Algorithm steps. Left and right arrow keys change the step.');
    this.caption.setAttribute('aria-live', 'polite');

    this.prev.type = this.next.type = this.play.type = 'button';
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = String(this.last);
    this.slider.value = '0';
    this.slider.setAttribute('aria-label', 'Step');
    this.prev.addEventListener('click', () => { this.pause(); this.go(this.index - 1); });
    this.next.addEventListener('click', () => { this.pause(); this.go(this.index + 1); });
    this.slider.addEventListener('input', () => { this.pause(); this.go(Number(this.slider.value)); });
    this.play.addEventListener('click', () => (this.timer ? this.pause() : this.start()));
    figure.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') { this.pause(); this.go(this.index + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { this.pause(); this.go(this.index - 1); e.preventDefault(); }
    });

    const controls = el('div', 'am-controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Step controls');
    if (this.last > 0) controls.append(this.prev, this.play, this.next, this.slider, this.count);
    figure.append(this.stage, this.caption);
    if (this.last > 0) figure.append(controls);
    figure.append(this.legend());
    container.replaceChildren(figure);
    this.go(0);
  }

  private go(i: number) {
    this.index = Math.min(Math.max(i, 0), this.last);
    this.stage.innerHTML = renderSvg(this.d, this.index, { idPrefix: this.id });
    this.caption.textContent = this.d.frames[this.index].caption;
    this.slider.value = String(this.index);
    this.count.textContent = `${this.index} / ${this.last}`;
    this.prev.disabled = this.index === 0;
    this.next.disabled = this.index === this.last;
  }

  private start() {
    if (this.index === this.last) this.go(0);
    this.play.textContent = 'Pause';
    this.timer = setInterval(() => {
      if (this.index >= this.last) { this.pause(); return; }
      this.go(this.index + 1);
      if (this.index >= this.last) this.pause();
    }, this.interval);
  }

  private pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.play.textContent = this.index === this.last && this.last > 0 ? 'Replay' : 'Play';
  }

  private legend() {
    const box = el('div', 'am-legend');
    const used = new Set<string>();
    for (const f of this.d.frames) for (const st of Object.values(f.state)) {
      Object.values(st.flash).forEach((v) => used.add(v));
      Object.values(st.kept).forEach((v) => used.add(v));
    }
    const item = (key: string, text: string, color: string, dashed = false) => {
      if (!used.has(key)) return;
      const s = el('span');
      const i = el('i');
      i.style.borderColor = color;
      i.style.background = `color-mix(in srgb,${color} 22%,transparent)`;
      if (dashed) i.style.borderStyle = 'dashed';
      s.append(i, text);
      box.append(s);
    };
    item('compare', 'Comparing', 'var(--am-warn,var(--tm-warn,var(--warn,#b36b00)))');
    item('focus', 'Looking at', 'var(--am-focus,var(--tm-focus,var(--fm-flow-1,#4152e0)))');
    item('changed', 'Just changed', 'var(--am-1,var(--tm-1,var(--fm-flow-5,#7b4fd6)))');
    item('done', 'Done', 'var(--am-2,var(--tm-2,var(--fm-flow-4,#0b8f7a)))');
    item('visit', 'Visited', 'var(--am-3,var(--tm-3,var(--fm-flow-6,#1790c4)))', true);
    if (!box.childElementCount) box.hidden = true;
    return box;
  }
}
