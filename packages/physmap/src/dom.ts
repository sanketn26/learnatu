import { parsePhys } from './parse.ts';
import { startValues } from './scene.ts';
import type { Run, Scene } from './scene.ts';
import { num } from './draw.ts';

/**
 * Browser side: turns the text of a phys block into a live figure.
 *   Play / Replay and a time slider (when the scene changes with time), a caption, one slider for each `param`,
 *   and the author's `predict` questions with an answer to reveal.
 *   Import from "@learnatu/physmap/dom". Needs a DOM; the rest of the package does not.
 * Nothing plays by itself. With "reduce motion" on, Play steps faster instead of animating smoothly.
 */
export interface MountOptions {
  idPrefix?: string;
  /** Turns the name of a picture in the text into its address on the page. */
  resolveImage?: (ref: string) => string;
}

const CSS = `
.pm-figure{margin:1.5rem 0;border:1px solid var(--pm-line,var(--tm-line,var(--line,#dfe8e3)));border-radius:1.2rem;background:var(--pm-card,var(--tm-card,var(--surface,#fff)));overflow:hidden;color:var(--pm-ink,var(--tm-ink,var(--ink,#17332e)));font:15px/1.5 system-ui,sans-serif}
.pm-figure:focus-visible{outline:2px solid var(--pm-brand,var(--tm-brand,var(--brand,#0b8f7a)));outline-offset:2px}
.pm-stage{padding:.8rem .6rem .2rem;overflow-x:auto;background-image:radial-gradient(color-mix(in srgb,var(--pm-muted,var(--tm-muted,var(--muted,#60706c))) 28%,transparent) 1px,transparent 1.2px);background-size:22px 22px}
.pm-caption{margin:0;padding:.75rem 1rem;border-top:1px solid var(--pm-line,var(--tm-line,var(--line,#dfe8e3)));font-weight:600;min-height:3.2rem}
.pm-controls,.pm-params{display:flex;flex-wrap:wrap;gap:.5rem .9rem;align-items:center;padding:.7rem .9rem;border-top:1px solid var(--pm-line,var(--tm-line,var(--line,#dfe8e3)))}
.pm-controls button,.pm-predict summary{font:600 .88rem system-ui,sans-serif;min-height:2.4rem;padding:0 .95rem;border-radius:999px;border:1.5px solid var(--pm-line,var(--tm-line,var(--line,#dfe8e3)));background:var(--pm-card,var(--tm-card,var(--surface,#fff)));color:inherit;cursor:pointer}
.pm-controls .pm-main{background:var(--pm-ink,var(--tm-ink,var(--ink,#17332e)));color:var(--pm-card,var(--tm-card,var(--surface,#fff)));border-color:transparent;min-width:5.6rem}
.pm-controls input[type=range]{flex:1 1 9rem;min-width:7rem}
.pm-figure input[type=range]{accent-color:var(--pm-brand,var(--tm-brand,var(--brand,#0b8f7a)))}
.pm-time{font:600 .82rem ui-monospace,monospace;opacity:.7;white-space:nowrap}
.pm-params label{display:grid;gap:.15rem;flex:1 1 11rem;font-size:.86rem;font-weight:600}
.pm-params output{font:600 .82rem ui-monospace,monospace;opacity:.8}
.pm-params input{width:100%}
.pm-assume{margin:0;padding:.55rem 1rem;border-top:1px solid var(--pm-line,var(--tm-line,var(--line,#dfe8e3)));font-size:.84rem;opacity:.8}
.pm-predict{padding:.7rem 1rem;border-top:1px solid var(--pm-line,var(--tm-line,var(--line,#dfe8e3)))}
.pm-predict summary{display:inline-flex;align-items:center;list-style:none;padding-top:.3rem;padding-bottom:.3rem;height:auto}
.pm-predict summary::-webkit-details-marker{display:none}
.pm-predict p{margin:.5rem 0 0}
.pm-predict .pm-q{font-weight:700;margin:0 0 .5rem}
.pm-error{margin:1.5rem 0;padding:1rem 1.2rem;border:1.5px solid var(--pm-bad,var(--tm-bad,var(--bad,#c2314f)));border-radius:1rem;font-size:.92rem}
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

/** Handle for a mounted scene: `destroy()` stops any playback, for when the container is about to be reused. */
export interface Mounted { destroy(): void }

export function mountPhysmap(container: HTMLElement, source: string, options: MountOptions = {}): Mounted {
  injectStyles();
  const { scene, problems } = parsePhys(source);
  if (!scene) {
    const box = el('div', 'pm-error');
    box.setAttribute('role', 'alert');
    box.append(el('strong', undefined, 'This physics scene has a mistake'));
    const list = el('ul');
    problems.forEach((p) => list.append(el('li', undefined, `line ${p.line}: ${p.message}`)));
    box.append(list, el('pre', undefined, source));
    container.replaceChildren(box);
    return { destroy() {} };
  }
  const player = new Player(container, scene, options.idPrefix ?? `pm${++counter}`, options.resolveImage);
  return { destroy: () => player.destroy() };
}

class Player {
  private values: Record<string, number>;
  private run: Run;
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

  private scene: Scene;
  private id: string;
  private resolveImage?: (ref: string) => string;

  constructor(container: HTMLElement, scene: Scene, id: string, resolveImage?: (ref: string) => string) {
    this.scene = scene;
    this.id = id;
    this.resolveImage = resolveImage;
    this.values = startValues(scene);
    this.run = scene.run(this.values);
    const figure = el('figure', 'pm-figure');
    figure.tabIndex = 0;
    figure.setAttribute('aria-label', 'Physics scene. Space plays or pauses. Left and right arrow keys move through time.');
    this.caption.setAttribute('aria-live', 'polite');

    this.play.type = 'button';
    this.slider.type = 'range';
    this.slider.min = '0';
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

    figure.append(this.stage, this.caption);
    if (scene.playSeconds > 0) {
      const controls = el('div', 'pm-controls');
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Time controls');
      controls.append(this.play, this.slider, this.time);
      figure.append(controls);
    }

    if (scene.params.length) {
      const box = el('div', 'pm-params');
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', 'Change the scene');
      for (const p of scene.params) {
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
    if (scene.assumptions.length) figure.append(el('p', 'pm-assume', `Assumes: ${scene.assumptions.join('; ')}.`));
    for (const q of scene.predicts) {
      const box = el('div', 'pm-predict');
      const details = el('details');
      details.append(el('summary', undefined, 'Show the answer'), el('p', undefined, q.answer));
      box.append(el('p', 'pm-q', `Predict: ${q.question}`), details);
      figure.append(box);
    }
    container.replaceChildren(figure);
    this.slider.max = String(this.run.count - 1);
    this.go(0);
  }

  /** A slider moved: work the scene out again, and stay at the same moment. At most once per frame. */
  private changed() {
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      const fraction = this.run.count > 1 ? this.index / (this.run.count - 1) : 0;
      this.run = this.scene.run(this.values);
      this.slider.max = String(this.run.count - 1);
      this.go(Math.round(fraction * (this.run.count - 1)));
    });
  }

  private go(i: number) {
    this.index = Math.min(Math.max(Math.round(i), 0), this.run.count - 1);
    this.stage.innerHTML = this.run.svg(this.index, { idPrefix: this.id, resolveImage: this.resolveImage });
    this.caption.textContent = this.run.ok ? this.run.caption(this.index) : (this.run.problem ?? '');
    this.caption.hidden = !this.caption.textContent;
    this.slider.value = String(this.index);
    this.time.textContent = this.run.clock(this.index);
    this.stage.firstElementChild?.setAttribute('aria-label', this.run.describe(this.index));
  }

  destroy() {
    this.pause();
    if (this.pending) cancelAnimationFrame(this.pending);
    this.pending = 0;
  }

  private toggle() {
    if (this.raf) this.pause();
    else this.start();
  }

  private start() {
    const last = this.run.count - 1;
    if (last < 1) return;
    if (this.index >= last) this.go(0);
    this.play.textContent = 'Pause';
    this.startedAt = performance.now();
    this.from = this.index / last;
    const seconds = this.scene.playSeconds / (this.reduced ? 3 : 1);
    const frame = (now: number) => {
      const fraction = this.from + (now - this.startedAt) / 1000 / seconds;
      this.go(fraction * last);
      if (fraction >= 1) { this.pause(); return; }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private pause() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.play.textContent = this.index >= this.run.count - 1 ? 'Replay' : 'Play';
  }
}
