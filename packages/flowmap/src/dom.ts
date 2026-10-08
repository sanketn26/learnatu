import { parseFlow } from './parse.ts';
import { renderSvg } from './render.ts';
import { nodesDownWhenFailing } from './model.ts';
import type { Diagram } from './types.ts';

/**
 * Browser side: turns the text of a flow block into a live figure with controls.
 *   Pause / Play, "Show problems" on/off, one chip per flow, one button per what-if, a legend, and the list of
 *   problem areas the author named. Import from "@learnatu/flowmap/dom". Needs a DOM; the rest of the package does not.
 */
export interface MountOptions { idPrefix?: string }

const CSS = `
.fm-figure{margin:1.5rem 0;border:1px solid var(--fm-line,var(--line,#dfe8e3));border-radius:1.2rem;background:var(--fm-card,var(--surface,#fff));overflow:hidden;color:var(--fm-ink,var(--ink,#17332e));font:15px/1.5 system-ui,sans-serif}
.fm-controls{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;padding:.7rem .9rem;border-bottom:1px solid var(--fm-line,var(--line,#dfe8e3))}
.fm-controls button{font:600 .88rem system-ui,sans-serif;min-height:2.4rem;padding:0 .9rem;border-radius:999px;border:1.5px solid var(--fm-line,var(--line,#dfe8e3));background:var(--fm-card,var(--surface,#fff));color:inherit;cursor:pointer}
.fm-controls button[aria-pressed="true"]{border-color:var(--fm-ink,var(--ink,#17332e));background:color-mix(in srgb,var(--fm-muted,var(--muted,#60706c)) 12%,transparent)}
.fm-controls .fm-main{background:var(--fm-ink,var(--ink,#17332e));color:var(--fm-card,var(--surface,#fff));border-color:transparent}
.fm-controls i{display:inline-block;width:.65rem;height:.65rem;border-radius:50%;margin-right:.4rem}
.fm-controls .fm-sep{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;opacity:.65;margin-left:.4rem}
.fm-stage{padding:.6rem;background-image:radial-gradient(color-mix(in srgb,var(--fm-muted,var(--muted,#60706c)) 28%,transparent) 1px,transparent 1.2px);background-size:22px 22px}
.fm-stage{overflow-x:auto}.fm-stage svg{overflow:visible;min-width:760px}
.fm-controls:empty,.fm-legend[hidden],.fm-note[hidden]{display:none}.fm-legend{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;padding:.7rem .9rem;border-top:1px solid var(--fm-line,var(--line,#dfe8e3));font-size:.88rem;opacity:.85}
.fm-legend span{display:inline-flex;gap:.45rem;align-items:center}.fm-legend svg{width:1.7rem;height:1rem}
.fm-note{margin:0;padding:.7rem .9rem;background:color-mix(in srgb,var(--fm-bad,var(--bad,#c2314f)) 14%,transparent);font-size:.92rem}
.fm-findings{list-style:none;margin:0;padding:0 .9rem .9rem;display:grid;gap:.45rem}
.fm-findings li{display:grid;grid-template-columns:auto 1fr;gap:.2rem .7rem;padding:.6rem .8rem;border-radius:.8rem;font-size:.92rem}
.fm-findings .fm-bad{background:color-mix(in srgb,var(--fm-bad,var(--bad,#c2314f)) 14%,transparent)}
.fm-findings .fm-warn{background:color-mix(in srgb,var(--fm-warn,var(--warn,#b36b00)) 16%,transparent)}
.fm-findings b{font:800 .7rem system-ui,sans-serif;letter-spacing:.05em;padding-top:.25rem}
.fm-findings em{display:block;font:500 .7rem ui-monospace,monospace;font-style:normal;opacity:.6;text-transform:uppercase;letter-spacing:.04em}
.fm-error{margin:1.5rem 0;padding:1rem 1.2rem;border:1.5px solid var(--fm-bad,var(--bad,#c2314f));border-radius:1rem;font-size:.92rem}
.fm-error pre{margin:.6rem 0 0;overflow:auto;white-space:pre-wrap;font:.82rem/1.5 ui-monospace,monospace}
`;

function injectStyles() {
  if (document.getElementById('fm-dom-style')) return;
  const style = document.createElement('style');
  style.id = 'fm-dom-style';
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

export function mountFlowmap(container: HTMLElement, source: string, options: MountOptions = {}): void {
  injectStyles();
  const { diagram, problems } = parseFlow(source);
  if (!diagram) {
    const box = el('div', 'fm-error');
    box.setAttribute('role', 'alert');
    box.append(el('strong', undefined, 'This diagram has a mistake'));
    const list = el('ul');
    problems.forEach((p) => list.append(el('li', undefined, `line ${p.line}: ${p.message}`)));
    box.append(list, el('pre', undefined, source));
    container.replaceChildren(box);
    return;
  }
  new Figure(container, diagram, options.idPrefix ?? `fm${++counter}`);
}

class Figure {
  private animate: boolean;
  private showProblems = true;
  private hiddenFlows = new Set<string>();
  private whatif: number | null = null;
  private stage = el('div', 'fm-stage');
  private note = el('p', 'fm-note');
  private reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private container: HTMLElement, private d: Diagram, private id: string) {
    this.animate = !this.reduceMotion;
    const figure = el('figure', 'fm-figure');
    figure.append(this.controls(), this.stage, this.legend());
    this.note.hidden = true;
    figure.append(this.note);
    const findings = this.findings();
    if (findings) figure.append(findings);
    container.replaceChildren(figure);
    this.draw();
  }

  private svg(): SVGSVGElement | null { return this.stage.querySelector('svg'); }

  private draw() {
    this.stage.innerHTML = renderSvg(this.d, { animate: this.animate, idPrefix: this.id });
    this.apply();
  }

  /** Applies the toggles to the drawn diagram. */
  private apply() {
    const svg = this.svg();
    if (!svg) return;
    svg.classList.toggle('fm-hide-problems', !this.showProblems);
    const stopped = new Set<string>(this.whatif === null ? [] : this.d.whatifs[this.whatif].stops);
    svg.querySelectorAll<SVGGElement>('.fm-flow').forEach((g) => {
      g.style.display = this.hiddenFlows.has(g.dataset.flow ?? '') || stopped.has(g.dataset.flow ?? '') ? 'none' : '';
    });
    const down = new Set(this.whatif === null ? [] : nodesDownWhenFailing(this.d, this.d.whatifs[this.whatif].fail));
    svg.querySelectorAll<SVGGElement>('.fm-node').forEach((g) => g.classList.toggle('fm-down', down.has(g.dataset.id ?? '')));
    if (this.whatif === null) this.note.hidden = true;
    else {
      const w = this.d.whatifs[this.whatif];
      const names = w.stops.map((s) => this.d.flows.find((f) => f.id === s)?.label ?? s);
      this.note.hidden = false;
      this.note.textContent = `${w.label} ${names.length ? `Stops: ${names.join(', ')}.` : 'Nothing is declared to stop.'} (Shown as written in the diagram's text.)`;
    }
  }

  private toggleButton(label: string, pressed: boolean, onClick: (button: HTMLButtonElement) => void) {
    const b = el('button', undefined, label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(pressed));
    b.addEventListener('click', () => onClick(b));
    return b;
  }

  private controls() {
    const bar = el('div', 'fm-controls');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Diagram controls');
    const play = el('button', 'fm-main', this.animate ? 'Pause' : 'Play animation');
    play.type = 'button';
    let paused = false;
    play.addEventListener('click', () => {
      if (!this.animate) { this.animate = true; paused = false; this.draw(); play.textContent = 'Pause'; return; }
      paused = !paused;
      const svg = this.svg();
      if (paused) svg?.pauseAnimations(); else svg?.unpauseAnimations();
      play.textContent = paused ? 'Play' : 'Pause';
    });
    if (this.d.flows.length) bar.append(play);
    if (this.d.marks.length) {
      bar.append(this.toggleButton('Show problems', true, (b) => { this.showProblems = !this.showProblems; b.setAttribute('aria-pressed', String(this.showProblems)); this.apply(); }));
    }
    this.d.whatifs.forEach((w, i) => {
      const button = this.toggleButton(w.label, false, (b) => {
        this.whatif = this.whatif === i ? null : i;
        bar.querySelectorAll<HTMLButtonElement>('[data-whatif]').forEach((x) => x.setAttribute('aria-pressed', String(x === b && this.whatif === i)));
        this.apply();
      });
      button.dataset.whatif = String(i);
      bar.append(button);
    });
    if (this.d.flows.length > 1 || (this.d.flows.length === 1 && this.d.whatifs.length)) {
      bar.append(el('span', 'fm-sep', 'Flows'));
      this.d.flows.forEach((f) => {
        const b = this.toggleButton(f.label, true, (btn) => {
          if (this.hiddenFlows.has(f.id)) this.hiddenFlows.delete(f.id); else this.hiddenFlows.add(f.id);
          btn.setAttribute('aria-pressed', String(!this.hiddenFlows.has(f.id)));
          this.apply();
        });
        const dot = el('i');
        dot.style.background = `var(--fm-flow-${f.color},${['#4152e0', '#d6446f', '#c47c00', '#0b8f7a', '#7b4fd6', '#1790c4'][f.color - 1]})`;
        b.prepend(dot);
        bar.append(b);
      });
    }
    return bar;
  }

  private legend() {
    const box = el('div', 'fm-legend');
    const item = (svg: string, text: string) => { const s = el('span'); s.innerHTML = svg; s.append(text); box.append(s); };
    const bad = 'var(--fm-bad,var(--bad,#c2314f))', warn = 'var(--fm-warn,var(--warn,#b36b00))', mut = 'var(--fm-muted,var(--muted,#60706c))';
    if (this.d.marks.some((m) => m.kind === 'spof')) item(`<svg viewBox="0 0 30 18"><rect x="2" y="3" width="26" height="12" rx="4" fill="none" stroke="${bad}" stroke-width="2.4" stroke-dasharray="5 3"/></svg>`, 'Single point of failure');
    if (this.d.marks.some((m) => m.kind === 'chokepoint')) item(`<svg viewBox="0 0 30 18"><rect x="2" y="3" width="26" height="12" rx="4" fill="none" stroke="${warn}" stroke-width="3"/></svg>`, 'Chokepoint');
    if (this.d.edges.some((e) => e.twoWay)) item(`<svg viewBox="0 0 30 18"><path d="M3 9h24M8 5 3 9l5 4M22 5l5 4-5 4" fill="none" stroke="${mut}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`, 'Two-way flow');
    if (this.d.flows.length) item(`<svg viewBox="0 0 30 18"><circle cx="15" cy="9" r="5" fill="var(--fm-flow-1,#4152e0)"/></svg>`, 'Traffic along a flow');
    if (!box.childElementCount) box.hidden = true;
    return box;
  }

  private findings() {
    if (!this.d.marks.length) return null;
    const list = el('ul', 'fm-findings');
    list.setAttribute('aria-label', 'Problem areas');
    const name = (id: string) => this.d.nodes.find((n) => n.id === id)?.label ?? id;
    for (const m of this.d.marks) {
      const li = el('li', m.kind === 'spof' ? 'fm-bad' : 'fm-warn');
      const badge = m.kind === 'spof' ? 'SPOF' : (m.badge ?? (m.edge ? 'LINK' : 'CHOKE'));
      const edge = m.edge ? this.d.edges.find((e) => e.id === m.edge) : undefined;
      const target = m.node ? name(m.node) : edge ? `${name(edge.from)} to ${name(edge.to)} link` : '';
      const body = el('span', undefined, `${target}${m.reason ? `: ${m.reason}` : ''}`);
      body.append(el('em', undefined, `line ${m.line}`));
      li.append(el('b', undefined, badge), body);
      list.append(li);
    }
    return list;
  }
}
