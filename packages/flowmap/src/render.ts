import type { Cubic, Diagram, FlowNode, Flow } from './types.ts';
import { layout, cubicPoint } from './layout.ts';
import type { Layout } from './layout.ts';
import { subLabel } from './model.ts';

/**
 * Draws a Diagram as an SVG string. No DOM needed, so it runs anywhere (build, server, browser, tests).
 *
 * Colours come from CSS variables with fallbacks. Set --fm-ink, --fm-muted, --fm-card, --fm-line,
 * --fm-bad, --fm-warn and --fm-flow-1 ... --fm-flow-6 to match your page; the site's own --ink, --muted, --surface
 * and --line are used when those are not set.
 */
export interface RenderOptions {
  /** Moving traffic. When false the diagram is still and flows are shown as numbered steps. Default true. */
  animate?: boolean;
  /** Makes ids unique when several diagrams share a page. Default "fm". */
  idPrefix?: string;
}

const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const n1 = (v: number) => (Math.round(v * 10) / 10).toString();
const pt = (p: { x: number; y: number }) => `${n1(p.x)} ${n1(p.y)}`;
const cubicD = (c: Cubic) => `M${pt(c.p1)}C${pt(c.c1)} ${pt(c.c2)} ${pt(c.p2)}`;
const cubicReverseD = (c: Cubic) => `M${pt(c.p2)}C${pt(c.c2)} ${pt(c.c1)} ${pt(c.p1)}`;

/** 20x20 line icons, one per kind of block. */
const ICONS: Record<string, string> = {
  client: 'M3 4h14v9H3z M7 16.5h6 M10 13v3.5',
  service: 'M10 2.5 16.5 6v8L10 17.5 3.5 14V6z M3.5 6 10 9.5 16.5 6 M10 9.5v8',
  gateway: 'M3 6.5h11 M11.5 3.5l3 3-3 3 M17 13.5H6 M8.5 10.5l-3 3 3 3',
  cache: 'M11 2 4.5 11H9l-1 7 7.5-9.5H11z',
  database: 'M4 5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5-2.7 2.5-6 2.5S4 6.4 4 5z M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5 M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5',
  storage: 'M3 6h14v10H3z M3 6l2-3h10l2 3 M8 10h4',
  queue: 'M3 5.5h9 M3 10h14 M3 14.5h9 M14 4l3 1.5L14 7',
  worker: 'M10 7a3 3 0 100 6 3 3 0 000-6z M10 2v3 M10 15v3 M2 10h3 M15 10h3 M4.3 4.3l2.1 2.1 M13.6 13.6l2.1 2.1 M15.7 4.3l-2.1 2.1 M6.4 13.6l-2.1 2.1',
  external: 'M6 15.5a3.8 3.8 0 010-7.6 5 5 0 019.4 1.4 3.1 3.1 0 01-.6 6.2z',
  ingress: 'M2.5 10h9 M8.5 6l4 4-4 4 M17 3v14',
  egress: 'M17.5 10h-9 M11.5 6l-4 4 4 4 M3 3v14',
  proxy: 'M10 2l6 2v5c0 4-3 7-6 9-3-2-6-5-6-9V4z'
};
const isProxy = (kind: string) => kind === 'ingress' || kind === 'egress' || kind === 'proxy';
const KIND_COLOUR: Record<string, string> = {
  client: 'muted', external: 'muted', service: 'f1', gateway: 'f3', ingress: 'f3', egress: 'f3', proxy: 'f3',
  cache: 'f5', database: 'f4', storage: 'f4', queue: 'f2', worker: 'worker'
};
const SPEED_SECONDS = { slow: 1.9, normal: 1.25, fast: 0.8 } as const;

const STYLE = `
.fm{--_ink:var(--fm-ink,var(--ink,#17332e));--_muted:var(--fm-muted,var(--muted,#60706c));--_card:var(--fm-card,var(--surface,#fff));--_line:var(--fm-line,var(--line,#dfe8e3));
--_bad:var(--fm-bad,var(--bad,#c2314f));--_warn:var(--fm-warn,var(--warn,#b36b00));--_brand:var(--fm-brand,var(--brand,#0b8f7a));
--_f1:var(--fm-flow-1,#4152e0);--_f2:var(--fm-flow-2,#d6446f);--_f3:var(--fm-flow-3,#c47c00);--_f4:var(--fm-flow-4,#0b8f7a);--_f5:var(--fm-flow-5,#7b4fd6);--_f6:var(--fm-flow-6,#1790c4);--_worker:#6b7aa8;
font-family:var(--fm-font,inherit)}
.fm .fm-edge{stroke:color-mix(in srgb,var(--_muted) 75%,transparent);stroke-width:2.2;fill:none;stroke-linecap:round}
.fm .fm-edge.fm-choke{stroke:var(--_warn);stroke-width:4}
.fm .fm-elabel{font:600 12.5px sans-serif;fill:var(--_muted);paint-order:stroke;stroke:var(--_card);stroke-width:5px;stroke-linejoin:round;text-anchor:middle}
.fm .fm-pill rect{fill:var(--_warn)}.fm .fm-pill text{fill:#1b1200;font:800 11px sans-serif;text-anchor:middle}
.fm .fm-card{fill:var(--_card);stroke:color-mix(in srgb,var(--_ink) 22%,var(--_line));stroke-width:1.5;filter:url(#SHADOW)}
.fm .fm-ibg{fill:color-mix(in srgb,var(--kc) 16%,var(--_card))}
.fm .fm-icon{fill:none;stroke:var(--kc);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.fm .fm-name{fill:var(--_ink);font:700 15px sans-serif;text-anchor:start}
.fm .fm-sub{fill:var(--_muted);font:500 12px sans-serif;text-anchor:start}
.fm .fm-ring,.fm .fm-glow{display:none}
.fm .fm-spof .fm-ring{display:block;fill:none;stroke:var(--_bad);stroke-width:2.2;stroke-dasharray:8 5}
.fm .fm-spof .fm-glow{display:block;fill:var(--_bad);opacity:.06;animation:fm-pulse 2.4s ease-in-out infinite}
.fm .fm-chokenode .fm-card{stroke:var(--_warn);stroke-width:3.2}
@keyframes fm-pulse{0%,100%{opacity:.06}50%{opacity:.22}}
@media (prefers-reduced-motion:reduce){.fm .fm-spof .fm-glow{animation:none;opacity:.12}}
.fm .fm-badge rect{rx:10}.fm .fm-badge.fm-bad rect{fill:var(--_bad)}.fm .fm-badge.fm-warn rect{fill:var(--_warn)}
.fm .fm-badge text{fill:#fff;font:800 10.5px sans-serif;letter-spacing:.05em;text-anchor:middle}.fm .fm-badge.fm-warn text{fill:#1b1200}
.fm .fm-group .fm-box{fill:color-mix(in srgb,var(--_muted) 7%,transparent);stroke:color-mix(in srgb,var(--_muted) 65%,transparent);stroke-width:1.6}
.fm .fm-group.fm-cluster .fm-box,.fm .fm-group.fm-namespace .fm-box{fill:color-mix(in srgb,var(--_f1) 7%,transparent);stroke:var(--_f1);stroke-dasharray:7 5;stroke-width:1.8}
.fm .fm-group.fm-subnet .fm-box{stroke-dasharray:3 4}
.fm .fm-group.fm-layer .fm-box{fill:color-mix(in srgb,var(--_muted) 5%,transparent);stroke:none}
.fm .fm-chip{fill:var(--_card);stroke:color-mix(in srgb,var(--_muted) 55%,transparent);stroke-width:1.2}
.fm .fm-group.fm-cluster .fm-chip,.fm .fm-group.fm-namespace .fm-chip{stroke:var(--_f1)}
.fm .fm-group text{fill:var(--_muted);font:700 11.5px sans-serif;letter-spacing:.06em;text-transform:uppercase;text-anchor:middle}
.fm .fm-group.fm-cluster text,.fm .fm-group.fm-namespace text{fill:var(--_f1)}
.fm .fm-zone{fill:var(--_card);stroke:color-mix(in srgb,var(--_muted) 50%,transparent);stroke-width:1}.fm .fm-zonet{fill:var(--_muted);font:700 9.5px sans-serif;letter-spacing:.05em;text-anchor:middle;text-transform:uppercase}
.fm .fm-down{opacity:.32}.fm .fm-down .fm-card{stroke:var(--_bad);stroke-dasharray:4 4}
.fm .fm-sidecar rect{fill:color-mix(in srgb,var(--_f3) 28%,var(--_card));stroke:var(--_f3);stroke-width:1.6}.fm .fm-sidecar text{fill:var(--_ink);font:800 10px sans-serif;text-anchor:middle}
.fm .fm-step circle{stroke:var(--_card);stroke-width:2}.fm .fm-step text{fill:#fff;font:800 11px sans-serif;text-anchor:middle}
.fm.fm-hide-problems .fm-badge,.fm.fm-hide-problems .fm-ring,.fm.fm-hide-problems .fm-glow,.fm.fm-hide-problems .fm-pill{display:none}
.fm.fm-hide-problems .fm-chokenode .fm-card{stroke:color-mix(in srgb,var(--_ink) 22%,var(--_line));stroke-width:1.5}
.fm.fm-hide-problems .fm-edge.fm-choke{stroke:color-mix(in srgb,var(--_muted) 75%,transparent);stroke-width:2.2}
`.replace(/\n/g, '');

/** A sentence-style summary of the diagram for screen readers (also used as the <desc>). */
export function describe(d: Diagram): string {
  const parts: string[] = [];
  parts.push(`Block diagram${d.title ? `: ${d.title}` : ''}. ${d.nodes.length} blocks: ${d.nodes.map((n) => n.label).join(', ')}.`);
  const label = (id: string) => d.nodes.find((n) => n.id === id)?.label ?? id;
  for (const f of d.flows) {
    const path = [f.hops[0].from, ...f.hops.map((h) => h.to)].map(label).join(' to ');
    parts.push(`Flow "${f.label}": ${path}${f.hops.some((h) => h.twoWay) ? ', with replies coming back' : ''}.`);
  }
  for (const m of d.marks) {
    const target = m.node ? label(m.node) : (() => { const e = d.edges.find((x) => x.id === m.edge); return e ? `the link from ${label(e.from)} to ${label(e.to)}` : ''; })();
    parts.push(`${m.kind === 'spof' ? 'Single point of failure' : 'Chokepoint'}: ${target}${m.reason ? `. ${m.reason}` : ''}.`);
  }
  for (const w of d.whatifs) parts.push(`What if: ${w.label}${w.stops.length ? ` Stops: ${w.stops.map((s) => d.flows.find((f) => f.id === s)?.label ?? s).join(', ')}.` : ''}`);
  return parts.join(' ');
}

export function renderSvg(d: Diagram, options: RenderOptions = {}, precomputed?: Layout): string {
  const animate = options.animate !== false;
  const id = options.idPrefix ?? 'fm';
  const L = precomputed ?? layout(d);
  const out: string[] = [];
  const view = L.view;
  out.push(`<svg class="fm" xmlns="http://www.w3.org/2000/svg" viewBox="${n1(view.x)} ${n1(view.y)} ${n1(view.w)} ${n1(view.h)}" role="img" aria-labelledby="${id}-t ${id}-d" style="width:100%;min-width:${Math.round(Math.min(760, view.w))}px;max-width:${Math.round(view.w * 1.15)}px;height:auto;display:block;margin:0 auto">`);
  out.push(`<title id="${id}-t">${esc(d.title ?? 'Block diagram')}</title><desc id="${id}-d">${esc(describe(d))}</desc>`);
  out.push(`<style>${STYLE.replace(/SHADOW/g, `${id}-shadow`)}</style>`);
  out.push(`<defs><filter id="${id}-shadow" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0a0f2a" flood-opacity=".2"/></filter>`
    + `<filter id="${id}-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    + marker(`${id}-arr`, 'color-mix(in srgb,var(--_muted) 85%,transparent)') + marker(`${id}-arrw`, 'var(--_warn)') + `</defs>`);

  // groups
  out.push('<g class="fm-groups">');
  for (const g of L.groups) {
    const w = 22 + g.label.length * 7.4;
    const x = g.x - g.w / 2 + 18, y = g.y - g.h / 2 - 12;
    out.push(`<g class="fm-group fm-${g.kind}" data-group="${esc(g.id)}"><rect class="fm-box" x="${n1(g.x - g.w / 2)}" y="${n1(g.y - g.h / 2)}" width="${n1(g.w)}" height="${n1(g.h)}" rx="22"/>`
      + `<rect class="fm-chip" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="24" rx="12"/><text x="${n1(x + w / 2)}" y="${n1(y + 16)}">${esc(g.label)}</text></g>`);
  }
  out.push('</g>');

  // links
  const markFor = (kind: 'chokepoint', edge: string) => d.marks.find((m) => m.kind === kind && m.edge === edge);
  out.push('<g class="fm-edges">');
  const labels: string[] = [];
  for (const e of d.edges) {
    const le = L.edges.get(e.id)!;
    const choke = markFor('chokepoint', e.id);
    const arrow = `${id}-${choke ? 'arrw' : 'arr'}`;
    out.push(`<path class="fm-edge${choke ? ' fm-choke' : ''}" d="${cubicD(le.curve)}" marker-end="url(#${arrow})"${e.twoWay ? ` marker-start="url(#${arrow})"` : ''}/>`);
    if (e.label) labels.push(`<text class="fm-elabel" x="${n1(le.mid.x)}" y="${n1(le.mid.y - 9)}">${esc(e.label)}</text>`);
    if (choke?.badge) {
      const pw = 14 + choke.badge.length * 7;
      labels.push(`<g class="fm-pill" transform="translate(${n1(le.mid.x - pw / 2)},${n1(le.mid.y + 4)})"><rect width="${n1(pw)}" height="18" rx="9"/><text x="${n1(pw / 2)}" y="12.8">${esc(choke.badge)}</text></g>`);
    }
  }
  out.push('</g>');

  // traffic (under the blocks, so dots slip behind a block when they pass through it)
  if (animate) out.push(`<g class="fm-packets">${d.flows.map((f) => packets(d, L, f, id)).join('')}</g>`);
  else out.push(`<g class="fm-steps">${steps(d, L)}</g>`);

  // blocks
  out.push('<g class="fm-nodes">');
  for (const n of d.nodes) out.push(node(d, L, n));
  out.push('</g>');
  out.push(`<g class="fm-labels">${labels.join('')}</g>`);
  out.push('</svg>');
  return out.join('');
}

function marker(id: string, fill: string) {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M1.5 1.5 8.5 5 1.5 8.5z" fill="${fill}" stroke="${fill}" stroke-width="1" stroke-linejoin="round"/></marker>`;
}

function node(d: Diagram, L: Layout, n: FlowNode): string {
  const p = L.nodes.get(n.id)!;
  const spof = d.marks.find((m) => m.kind === 'spof' && m.node === n.id);
  const choke = d.marks.find((m) => m.kind === 'chokepoint' && m.node === n.id);
  const sub = subLabel(d, n);
  const proxy = isProxy(n.kind);
  const rx = proxy ? p.h / 2 : 16;
  const kc = `var(--_${KIND_COLOUR[n.kind] ?? 'f1'})`;
  const cy = p.h / 2;
  const ix = 31, tx = ix + 29;
  const tip = [n.label, spof ? 'single point of failure' : '', choke ? 'chokepoint' : ''].filter(Boolean).join(' · ');
  const reasons = [spof?.reason, choke?.reason].filter(Boolean).join(' ');
  const parts: string[] = [];
  parts.push(`<g class="fm-node${spof ? ' fm-spof' : ''}${choke ? ' fm-chokenode' : ''}" data-id="${esc(n.id)}" data-zones="${esc(n.zones.join(','))}" style="--kc:${kc}" transform="translate(${n1(p.x - p.w / 2)},${n1(p.y - p.h / 2)})">`);
  parts.push(`<title>${esc(tip + (reasons ? `. ${reasons}` : ''))}</title>`);
  parts.push(`<rect class="fm-glow" x="-10" y="-10" width="${n1(p.w + 20)}" height="${n1(p.h + 20)}" rx="${rx + 8}"/><rect class="fm-ring" x="-6" y="-6" width="${n1(p.w + 12)}" height="${n1(p.h + 12)}" rx="${rx + 5}"/>`);
  parts.push(`<rect class="fm-card" width="${n1(p.w)}" height="${n1(p.h)}" rx="${rx}"/>`);
  parts.push(`<circle class="fm-ibg" cx="${ix}" cy="${n1(cy)}" r="19"/><g transform="translate(${ix - 10},${n1(cy - 10)})"><path class="fm-icon" d="${ICONS[n.kind] ?? ICONS.service}"/></g>`);
  parts.push(`<text class="fm-name" x="${tx}" y="${n1(sub ? cy - 2 : cy + 5)}">${esc(n.label)}</text>`);
  if (sub) parts.push(`<text class="fm-sub" x="${tx}" y="${n1(cy + 16)}">${esc(sub)}</text>`);
  if (n.sidecar) {
    parts.push(`<g class="fm-sidecar" transform="translate(${n1(p.w - 40)},${n1(p.h - 8)})"><rect width="44" height="18" rx="9"/><text x="22" y="12.6">${esc(n.sidecar)}</text><title>Sidecar proxy: ${esc(n.sidecar)}</title></g>`);
  }
  if (n.zones.length) {
    const zl = n.zones.map((z) => d.groups.find((g) => g.id === z)?.label.replace(/^zone\s*/i, '') ?? z).join('+');
    const text = `ZONE ${zl}`;
    const w = 12 + text.length * 5.8;
    parts.push(`<g transform="translate(${n1(tx)},${n1(p.h - 7)})"><rect class="fm-zone" width="${n1(w)}" height="14" rx="7"/><text class="fm-zonet" x="${n1(w / 2)}" y="10.4">${esc(text)}</text></g>`);
  }
  let used = 0;
  const badge = (text: string, cls: string) => {
    const w = 16 + text.length * 6.8;
    parts.push(`<g class="fm-badge ${cls}" transform="translate(${n1(p.w - w - 6 - used)},-14)"><rect width="${n1(w)}" height="20"/><text x="${n1(w / 2)}" y="14">${esc(text)}</text></g>`);
    used += w + 5;
  };
  if (spof) badge('SPOF', 'fm-bad');
  if (choke) badge(choke.badge ?? 'CHOKEPOINT', 'fm-warn');
  parts.push('</g>');
  return parts.join('');
}

/** Moving dots for one flow: a glowing dot with a short trail along the route; two-way hops also send a reply back. */
function packets(d: Diagram, L: Layout, f: Flow, id: string): string {
  const hop = SPEED_SECONDS[d.speed];
  const total = f.hops.length * hop + 0.9;
  const window = (f.hops.length * hop) / total;
  const colour = `var(--_f${f.color})`;
  const segment = (h: Flow['hops'][number]) => {
    const edge = d.edges.find((e) => e.id === h.edge)!;
    const c = L.edges.get(h.edge)!.curve;
    return h.from === edge.from ? { start: c.p1, d: cubicD(c) } : { start: c.p2, d: cubicReverseD(c) };
  };
  let route = '';
  f.hops.forEach((h, i) => {
    const s = segment(h);
    route += i === 0 ? s.d : `L${pt(s.start)}${s.d.replace(/^M[^C]*/, '')}`;
  });
  const count = Math.max(1, Math.min(3, Math.round((f.rate ?? 20) / 30) + (f.hops.length > 2 ? 1 : 0)));
  const dots: string[] = [];
  const addDot = (path: string, from: number, to: number, begin: number) => {
    for (const [r, o, lag] of [[6.2, 1, 0], [4.6, 0.5, 0.09], [3.2, 0.25, 0.18]] as const) {
      const b = `${(begin + lag).toFixed(2)}s`;
      dots.push(`<circle r="${r}" fill="${colour}" opacity="0"${lag === 0 ? ` filter="url(#${id}-glow)"` : ''}>`
        + `<animateMotion dur="${total.toFixed(2)}s" repeatCount="indefinite" begin="${b}" path="${path}" keyPoints="0;0;1;1" keyTimes="0;${from.toFixed(3)};${to.toFixed(3)};1" calcMode="linear"/>`
        + `<animate attributeName="opacity" dur="${total.toFixed(2)}s" repeatCount="indefinite" begin="${b}" values="0;0;${o};${o};0;0" keyTimes="0;${from.toFixed(3)};${(from + 0.05).toFixed(3)};${(to - 0.05).toFixed(3)};${to.toFixed(3)};1"/></circle>`);
    }
  };
  for (let i = 0; i < count; i++) addDot(route, 0, window, -((i * total) / count));
  f.hops.forEach((h, idx) => {
    if (!h.twoWay) return;
    const reverse = reverseOf(L.edges.get(h.edge)!.curve, h.from === d.edges.find((e) => e.id === h.edge)!.from);
    const start = (idx * hop) / total + 0.03, end = ((idx + 1) * hop) / total;
    for (let i = 0; i < count; i++) addDot(reverse, start, end, -((i * total) / count));
  });
  return `<g class="fm-flow" data-flow="${esc(f.id)}">${dots.join('')}</g>`;
}

/** The reply path: the same link, travelled the other way. */
const reverseOf = (c: Cubic, forward: boolean) => (forward ? cubicReverseD(c) : cubicD(c));

/** Still picture of the flows: a numbered dot on each link, in the order traffic uses it. */
function steps(d: Diagram, L: Layout): string {
  const stack = new Map<string, number>();
  const out: string[] = [];
  for (const f of d.flows) {
    f.hops.forEach((h, i) => {
      const k = stack.get(h.edge) ?? 0;
      stack.set(h.edge, k + 1);
      const c = L.edges.get(h.edge)!.curve;
      const p = cubicPoint(c, 0.3 + k * 0.2);
      out.push(`<g class="fm-step" transform="translate(${n1(p.x)},${n1(p.y)})"><circle r="9" fill="var(--_f${f.color})"/><text y="4">${i + 1}</text><title>${esc(f.label)}, step ${i + 1}</title></g>`);
    });
  }
  return out.join('');
}
