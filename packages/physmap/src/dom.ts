import { parsePhys } from './parse.ts';
import { simulate, startParams } from './sim.ts';
import { captionAt, describe, num, renderSvg } from './render.ts';
import type { Model, Simulation } from './types.ts';

/**
 * Browser side: turns the text of a phys block into a live figure.
 *   Play / Restart, a time slider, a caption that follows the author's notes, one slider for each `param`,
 *   and the author's `predict` questions with an answer to reveal.
 *   Import from "@learnatu/physmap/dom". Needs a DOM; the rest of the package does not.
 * Nothing plays by itself. With "reduce motion" on, Play jumps in larger steps instead of animating smoothly.
 */
export interface MountOptions {
  idPrefix?: string;
  /** Turns the name of a picture in the text into its address on the page. */
  resolveImage?: (ref: string) => string;
}

const CSS = `
.pm-figure{margin:1.5rem 0;border:1px solid var(--pm-line,var(--am-line,var(--fm-line,var(--line,#dfe8e3))));border-radius:1.2rem;background:var(--pm-card,var(--am-card,var(--fm-card,var(--surface,#fff))));overflow:hidden;color:var(--pm-ink,var(--am-ink,var(--fm-ink,var(--ink,#17332e))));font:15px/1.5 system-ui,sans-serif}
.pm-figure:focus-visible{outline:2px solid var(--pm-brand,var(--am-brand,var(--fm-brand,var(--brand,#0b8f7a))));outline-offset:2px}
.pm-stage{padding:.8rem .6rem .2rem;overflow-x:auto;background-image:radial-gradient(color-mix(in srgb,var(--pm-muted,var(--am-muted,var(--fm-muted,var(--muted,#60706c)))) 28%,transparent) 1px,transparent 1.2px);background-size:22px 22px}
.pm-caption{margin:0;padding:.75rem 1rem;border-top:1px solid var(--pm-line,var(--am-line,var(--fm-line,var(--line,#dfe8e3))));font-weight:600;min-height:3.2rem}
.pm-controls,.pm-params{display:flex;flex-wrap:wrap;gap:.5rem .9rem;align-items:center;padding:.7rem .9rem;border-top:1px solid var(--pm-line,var(--am-line,var(--fm-line,var(--line,#dfe8e3))))}
.pm-controls button,.pm-predict summary{font:600 .88rem system-ui,sans-serif;min-height:2.4rem;padding:0 .95rem;border-radius:999px;border:1.5px solid var(--pm-line,var(--am-line,var(--fm-line,var(--line,#dfe8e3))));background:var(--pm-card,var(--am-card,var(--fm-card,var(--surface,#fff))));color:inherit;cursor:pointer}
.pm-controls .pm-main{background:var(--pm-ink,var(--am-ink,var(--fm-ink,var(--ink,#17332e))));color:var(--pm-card,var(--am-card,var(--fm-card,var(--surface,#fff))));border-color:transparent;min-width:5.6rem}
.pm-controls input[type=range]{flex:1 1 9rem;min-width:7rem}
.pm-figure input[type=range]{accent-color:var(--pm-brand,var(--am-brand,var(--fm-brand,var(--brand,#0b8f7a))))}
.pm-time{font:600 .82rem ui-monospace,monospace;opacity:.7;white-space:nowrap}
.pm-params label{display:grid;gap:.15rem;flex:1 1 11rem;font-size:.86rem;font-weight:600}
.pm-params output{font:600 .82rem ui-monospace,monospace;opacity:.8}
.pm-params input{width:100%}
.pm-assume{margin:0;padding:.55rem 1rem;border-top:1px solid var(--pm-line,var(--am-line,var(--fm-line,var(--line,#dfe8e3))));font-size:.84rem;opacity:.8}
.pm-predict{padding:.7rem 1rem;border-top:1px solid var(--pm-line,var(--am-line,var(--fm-line,var(--line,#dfe8e3))))}
.pm-predict summary{display:inline-flex;align-items:center;list-style:none;padding-top:.3rem;padding-bottom:.3rem;height:auto}
.pm-predict summary::-webkit-details-marker{display:none}
.pm-predict p{margin:.5rem 0 0}
.pm-predict .pm-q{font-weight:700;margin:0 0 .5rem}
.pm-error{margin:1.5rem 0;padding:1rem 1.2rem;border:1.5px solid var(--pm-bad,var(--am-bad,var(--fm-bad,var(--bad,#c2314f))));border-radius:1rem;font-size:.92rem}
.pm-error pre{margin:.6rem 0 0;overflow:auto;white-space:pre-wrap;font:.82rem/1.5 ui-monospace,monospace}
`;

function injectStyles() {
  if (document.getElementById('pm-dom-style')) return;
  const style = document.createElement('style');
  style.id = 'pm-dom-style';
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

export function mountPhysmap(container: HTMLElement, source: string, options: MountOptions = {}): void {
  injectStyles();
  const { model, problems } = parsePhys(source);
  if (!model) {
    const box = el('div', 'pm-error');
    box.setAttribute('role', 'alert');
    box.append(el('strong', undefined, 'This physics scene has a mistake'));
    const list = el('ul');
    problems.forEach((p) => list.append(el('li', undefined, `line ${p.line}: ${p.message}`)));
    box.append(list, el('pre', undefined, source));
    container.replaceChildren(box);
    return;
  }
  new Player(container, model, options.idPrefix ?? `pm${++counter}`, options.resolveImage);
}

class Player {
  private values: Record<string, number>;
  private sim: Simulation;
  private index = 0;
  private raf = 0;
  private startedAt = 0;
  private from = 0;
  private stage = el('div', 'pm-stage');
  private caption = el('p', 'pm-caption');
  private play = el('button', 'pm-main', 'Play');
  private slider = el('input');
  private time = el('span', 'pm-time');
  private pending = 0;
  private reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(container: HTMLElement, private m: Model, private id: string, private resolveImage?: (ref: string) => string) {
    this.values = startParams(m);
    this.sim = simulate(m, this.values);
    const figure = el('figure', 'pm-figure');
    figure.tabIndex = 0;
    figure.setAttribute('aria-label', 'Physics scene. Space plays or pauses. Left and right arrow keys move through time.');
    this.caption.setAttribute('aria-live', 'polite');
    this.caption.hidden = !m.title && !m.notes.length;

    this.play.type = 'button';
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = String(this.sim.samples.length - 1);
    this.slider.value = '0';
    this.slider.setAttribute('aria-label', 'Time');
    this.slider.addEventListener('input', () => { this.pause(); this.go(Number(this.slider.value)); });
    this.play.addEventListener('click', () => this.toggle());
    figure.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === ' ') { this.toggle(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { this.pause(); this.go(this.index + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { this.pause(); this.go(this.index - 1); e.preventDefault(); }
    });

    const controls = el('div', 'pm-controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Time controls');
    controls.append(this.play, this.slider, this.time);
    figure.append(this.stage, this.caption, controls);

    if (m.params.length) {
      const box = el('div', 'pm-params');
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', 'Change the scene');
      for (const p of m.params) {
        const label = el('label');
        const out = el('output');
        const input = el('input');
        input.type = 'range';
        input.min = String(p.min / p.factor);
        input.max = String(p.max / p.factor);
        input.step = String((p.max - p.min) / p.factor / 200);
        input.value = String(p.start / p.factor);
        const show = () => { out.textContent = `${num(Number(input.value))} ${p.unit}`.trim(); };
        show();
        input.addEventListener('input', () => { show(); this.values[p.name] = Number(input.value) * p.factor; this.changed(); });
        label.append(el('span', undefined, p.label), out, input);
        box.append(label);
      }
      figure.append(box);
    }
    if (m.assumptions.length) figure.append(el('p', 'pm-assume', `Assumes: ${m.assumptions.join('; ')}.`));
    for (const q of m.predicts) {
      const box = el('div', 'pm-predict');
      const details = el('details');
      details.append(el('summary', undefined, 'Show the answer'), el('p', undefined, q.answer));
      box.append(el('p', 'pm-q', `Predict: ${q.question}`), details);
      figure.append(box);
    }
    container.replaceChildren(figure);
    this.go(0);
  }

  /** A slider moved: run the scene again, and stay at the same moment. At most once per frame. */
  private changed() {
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      const fraction = this.index / (this.sim.samples.length - 1);
      this.sim = simulate(this.m, this.values);
      this.go(Math.round(fraction * (this.sim.samples.length - 1)));
    });
  }

  private go(i: number) {
    this.index = Math.min(Math.max(Math.round(i), 0), this.sim.samples.length - 1);
    this.stage.innerHTML = renderSvg(this.m, this.sim, this.index, { idPrefix: this.id, resolveImage: this.resolveImage });
    this.caption.textContent = captionAt(this.m, this.sim.samples[this.index].t);
    this.slider.value = String(this.index);
    this.time.textContent = `${num(this.sim.samples[this.index].t)} / ${num(this.m.run)} s`;
    if (!this.sim.ok) this.caption.textContent = 'These slider settings make the scene run away. Move a slider back.';
    this.stage.firstElementChild?.setAttribute('aria-label', describe(this.m, this.sim, this.index));
  }

  private toggle() {
    if (this.raf) this.pause();
    else this.start();
  }

  private start() {
    const last = this.sim.samples.length - 1;
    if (this.index >= last) this.go(0);
    this.play.textContent = 'Pause';
    this.startedAt = performance.now();
    this.from = this.sim.samples[this.index].t;
    const frame = (now: number) => {
      const t = this.from + ((now - this.startedAt) / 1000) * (this.reduced ? 3 : 1);
      const i = (t / this.m.run) * last;
      this.go(i);
      if (i >= last) { this.pause(); return; }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private pause() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.play.textContent = this.index >= this.sim.samples.length - 1 ? 'Replay' : 'Play';
  }
}
