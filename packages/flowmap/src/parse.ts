import { GROUP_KINDS, NODE_KINDS, NODE_KIND_ALIASES, FlowSyntaxError } from './types.ts';
import type { Diagram, Flow, FlowEdge, FlowGroup, FlowNode, GroupKind, Mark, NodeKind, Problem, WhatIf } from './types.ts';
import { tokenize } from './tokenize.ts';
import type { Token } from './tokenize.ts';
import { findEdge } from './model.ts';

/**
 * Reads the text of a ```flow block into a Diagram. See the README for the language.
 * `parseFlow` never throws: it returns the diagram (when there are no mistakes) and every problem it found.
 * `parse` throws a FlowSyntaxError instead. `check` returns just the problems.
 */
export interface ParseResult { diagram: Diagram | null; problems: Problem[] }

const ID = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const SETTINGS = ['title', 'direction', 'speed'];
const KEYWORDS = [...SETTINGS, 'group', 'node', 'flow', 'spof', 'chokepoint', 'whatif'];
const NODE_ATTRS = ['replicas', 'capacity', 'in', 'zones', 'sidecar', 'sub', 'label', 'ip', 'ports'];

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = keep;
    }
  }
  return row[b.length];
}

/** ` Did you mean "db"?` when one of `choices` is close to `word`. */
function suggest(word: string, choices: string[]): string {
  let best = '';
  let bestDistance = 3;
  for (const choice of choices) {
    const d = distance(word.toLowerCase(), choice.toLowerCase());
    if (d < bestDistance) { best = choice; bestDistance = d; }
  }
  return best ? ` Did you mean "${best}"?` : '';
}

/** True when following `in=` parents from this group leads back to it. */
function hasParentCycle(groups: Map<string, FlowGroup>, start: string): boolean {
  const seen = new Set<string>();
  let current = groups.get(start)?.parent;
  while (current !== undefined) {
    if (current === start) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    current = groups.get(current)?.parent;
  }
  return false;
}

/** Why `text` is not an IP address (or address with /prefix), or '' when it is fine. IPv6 must be written in quotes because of its colons. */
function addressProblem(text: string, needPrefix = false): string {
  const [address, prefix, extra] = text.split('/');
  if (extra !== undefined || !address) return `"${text}" is not an address`;
  if (needPrefix && prefix === undefined) return `"${text}" needs a prefix, for example ${text}/24`;
  const v6 = address.includes(':');
  if (v6) {
    if (!/^[0-9a-fA-F:]+$/.test(address) || !address.includes('::') && address.split(':').length !== 8 || address.split(':').length > 8) return `"${text}" is not a valid IPv6 address`;
  } else {
    const octets = address.split('.');
    if (octets.length !== 4 || octets.some((o) => !/^\d{1,3}$/.test(o) || Number(o) > 255)) return `"${text}" is not a valid IPv4 address (four numbers from 0 to 255, like 10.0.0.1)`;
  }
  if (prefix !== undefined && (!/^\d{1,3}$/.test(prefix) || Number(prefix) > (v6 ? 128 : 32))) return `the /${prefix} in "${text}" is not a valid prefix (0 to ${v6 ? 128 : 32})`;
  return '';
}

const portProblem = (text: string): string => {
  const m = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(text);
  if (!m) return `"${text}" is not a port (use a number like 443 or a range like 8000-8100)`;
  const [from, to] = [Number(m[1]), Number(m[2] ?? m[1])];
  return from < 1 || to > 65535 || from > to ? `"${text}" is not a valid port or range (1 to 65535, lowest first)` : '';
};

const list = (items: readonly string[]) => items.map((i) => `"${i}"`).join(', ');

interface RawEdge { from: string; to: string; twoWay: boolean; label?: string; via?: string; line: number }
interface RawHop { from: string; to: string; twoWay: boolean }
interface RawFlow { id: string; label: string; rate?: number; color?: number; hops: RawHop[]; line: number }
interface RawMark { kind: 'spof' | 'chokepoint'; node?: string; edgeFrom?: string; edgeTo?: string; reason?: string; badge?: string; line: number }

export function parseFlow(source: string): ParseResult {
  const problems: Problem[] = [];
  const fail = (line: number, message: string) => { problems.push({ line, message }); };

  const diagram: Diagram = { direction: 'right', speed: 'normal', nodes: [], groups: [], edges: [], flows: [], marks: [], whatifs: [] };
  const nodes = new Map<string, FlowNode>();
  const groups = new Map<string, FlowGroup>();
  const rawEdges: RawEdge[] = [];
  const rawFlows: RawFlow[] = [];
  const rawMarks: RawMark[] = [];
  const rawWhatifs: { label: string; fail: string; stops: string[]; line: number }[] = [];
  const pendingNodeRefs: { id: string; line: number; what: string }[] = [];

  const ensureNode = (id: string, line: number, implicit: boolean) => {
    if (!ID.test(id)) { fail(line, `"${id}" is not a valid name. Use letters, digits, - and _, starting with a letter.`); return; }
    if (!nodes.has(id)) {
      if (!implicit) return;
      nodes.set(id, { id, label: id, kind: 'service', zones: [], ip: [], ports: [], line });
    }
  };

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  lines.forEach((text, index) => {
    const line = index + 1;
    const { tokens, error } = tokenize(text);
    if (error) { fail(line, error); return; }
    if (!tokens.length) return;
    const first = tokens[0];
    const keyword = first.type === 'word' ? first.text : '';
    const rest = tokens.slice(1);

    // ---- settings
    if (keyword === 'title') {
      if (rest.length !== 1 || rest[0].type !== 'string') return fail(line, 'title needs text in quotes, for example: title "Checkout traffic"');
      diagram.title = rest[0].text;
    } else if (keyword === 'direction') {
      const v = rest.length === 1 && rest[0].type === 'word' ? rest[0].text : '';
      if (v !== 'right' && v !== 'down') return fail(line, 'direction must be "right" or "down"');
      diagram.direction = v;
    } else if (keyword === 'speed') {
      const v = rest.length === 1 && rest[0].type === 'word' ? rest[0].text : '';
      if (v !== 'slow' && v !== 'normal' && v !== 'fast') return fail(line, 'speed must be "slow", "normal" or "fast"');
      diagram.speed = v;

    // ---- group ID "Label" kind [in=ID]
    } else if (keyword === 'group') {
      const [idTok, labelTok, kindTok, ...attrs] = rest;
      if (idTok?.type !== 'word') return fail(line, 'a group looks like: group prod "Production VPC" vpc');
      const id = idTok.text;
      if (!ID.test(id)) return fail(line, `"${id}" is not a valid name`);
      if (groups.has(id) || nodes.has(id)) return fail(line, `the name "${id}" is already used`);
      const label = labelTok?.type === 'string' ? labelTok.text : id;
      const kindWord = labelTok?.type === 'string' ? kindTok : labelTok;
      const restAttrs = labelTok?.type === 'string' ? attrs : [kindTok, ...attrs].filter(Boolean);
      if (kindWord?.type !== 'word' || !(GROUP_KINDS as readonly string[]).includes(kindWord.text)) {
        return fail(line, `a group needs a kind: ${list(GROUP_KINDS)}.${kindWord?.type === 'word' ? suggest(kindWord.text, [...GROUP_KINDS]) : ''}`);
      }
      const group: FlowGroup = { id, label, kind: kindWord.text as GroupKind, line };
      for (const tok of restAttrs as Token[]) {
        if (tok.type === 'attr' && tok.key === 'in') group.parent = tok.value;
        else if (tok.type === 'attr' && tok.key === 'cidr') {
          const problem = addressProblem(tok.value, true);
          if (problem) return fail(line, problem);
          group.cidr = tok.value;
        } else fail(line, 'a group only understands in=ID and cidr=ADDRESS/PREFIX');
      }
      groups.set(id, group);

    // ---- node ID "Label" [kind] [attrs]
    } else if (keyword === 'node') {
      const [idTok, ...others] = rest;
      if (idTok?.type !== 'word') return fail(line, 'a block looks like: node db "Orders DB" database capacity=100');
      const id = idTok.text;
      if (!ID.test(id)) return fail(line, `"${id}" is not a valid name`);
      if (groups.has(id)) return fail(line, `the name "${id}" is already used by a group`);
      const existing = nodes.get(id);
      if (existing && existing.line !== line && !existing.sub && existing.label === id && existing.kind === 'service') {
        // was created by an earlier link line; this declaration fills it in
      } else if (existing) {
        return fail(line, `the block "${id}" is already declared on line ${existing.line}`);
      }
      const node: FlowNode = { id, label: id, kind: 'service', zones: [], ip: [], ports: [], line: existing?.line ?? line };
      let labelSeen = false;
      for (const tok of others) {
        if (tok.type === 'string' && !labelSeen) { node.label = tok.text; labelSeen = true; }
        else if (tok.type === 'word') {
          const kind = (NODE_KINDS as readonly string[]).includes(tok.text) ? (tok.text as NodeKind) : NODE_KIND_ALIASES[tok.text.toLowerCase()];
          if (!kind) return fail(line, `"${tok.text}" is not a kind of block. Use one of: ${list(NODE_KINDS)}.${suggest(tok.text, [...NODE_KINDS, ...Object.keys(NODE_KIND_ALIASES)])}`);
          node.kind = kind;
        } else if (tok.type === 'attr') {
          const { key, value } = tok;
          if (key === 'label') node.label = value;
          else if (key === 'replicas') {
            const n = Number(value);
            if (!Number.isInteger(n) || n < 1) return fail(line, 'replicas must be a whole number, 1 or more');
            node.replicas = n;
          } else if (key === 'capacity') {
            const n = Number(value);
            if (!(n > 0)) return fail(line, 'capacity must be a number above 0');
            node.capacity = n;
          } else if (key === 'in') {
            node.group = value; pendingNodeRefs.push({ id: value, line, what: 'group' });
          } else if (key === 'zones') {
            node.zones = value.split(',').map((z) => z.trim()).filter(Boolean);
            node.zones.forEach((z) => pendingNodeRefs.push({ id: z, line, what: 'zone' }));
          } else if (key === 'ip') {
            node.ip = value.split(',').map((a) => a.trim()).filter(Boolean);
            const problem = node.ip.map((a) => addressProblem(a)).find(Boolean) ?? (node.ip.length ? '' : 'ip needs an address, for example ip=10.0.0.1');
            if (problem) return fail(line, problem);
          } else if (key === 'ports') {
            node.ports = value.split(',').map((a) => a.trim()).filter(Boolean);
            const problem = node.ports.map(portProblem).find(Boolean) ?? (node.ports.length ? '' : 'ports needs a number, for example ports=443');
            if (problem) return fail(line, problem);
          } else if (key === 'sidecar') node.sidecar = value;
          else if (key === 'sub') node.sub = value;
          else return fail(line, `"${key}" is not a setting of a block. Use: ${NODE_ATTRS.join(', ')}.${suggest(key, NODE_ATTRS)}`);
        } else {
          return fail(line, 'unexpected text in a block line');
        }
      }
      nodes.set(id, node);

    // ---- flow ID "Label" [rate=N] [color=N]: a -> b <-> c
    } else if (keyword === 'flow') {
      const colonAt = rest.findIndex((t) => t.type === 'colon');
      if (colonAt < 0) return fail(line, 'a flow looks like: flow checkout "Place order" rate=60: customer -> api -> db');
      const head = rest.slice(0, colonAt);
      const path = rest.slice(colonAt + 1);
      const [idTok, ...hs] = head;
      if (idTok?.type !== 'word' || !ID.test(idTok.text)) return fail(line, 'a flow needs a name first, for example: flow checkout "Place order": ...');
      const flow: RawFlow = { id: idTok.text, label: idTok.text, hops: [], line };
      for (const tok of hs) {
        if (tok.type === 'string') flow.label = tok.text;
        else if (tok.type === 'attr' && tok.key === 'rate') {
          const n = Number(tok.value);
          if (!(n > 0)) return fail(line, 'rate must be a number above 0');
          flow.rate = n;
        } else if (tok.type === 'attr' && tok.key === 'color') {
          const n = Number(tok.value);
          if (!Number.isInteger(n) || n < 1 || n > 6) return fail(line, 'color must be a number from 1 to 6');
          flow.color = n;
        } else return fail(line, 'a flow understands a label in quotes, rate=N and color=N');
      }
      if (rawFlows.some((f) => f.id === flow.id)) return fail(line, `the flow "${flow.id}" is already declared`);
      if (path.length < 3) return fail(line, 'a flow needs at least two blocks, for example: customer -> api');
      for (let i = 0; i < path.length; i++) {
        const tok = path[i];
        if (i % 2 === 0) {
          if (tok.type !== 'word') return fail(line, 'expected a block name in the flow path');
        } else {
          if (tok.type !== 'op') return fail(line, 'expected -> or <-> between blocks in a flow');
          if (tok.text === '<-') return fail(line, 'a flow always travels forward. Use -> or <->, and write the blocks in the order the traffic reaches them.');
          const from = (path[i - 1] as { text: string }).text;
          const to = path[i + 1];
          if (!to || to.type !== 'word') return fail(line, 'a flow cannot end with an arrow');
          flow.hops.push({ from, to: to.text, twoWay: tok.text === '<->' });
        }
      }
      rawFlows.push(flow);

    // ---- spof ID ["reason"]
    } else if (keyword === 'spof') {
      const [idTok, reasonTok, ...extra] = rest;
      if (idTok?.type !== 'word' || extra.length || (reasonTok && reasonTok.type !== 'string')) return fail(line, 'a single point of failure looks like: spof db "One copy, and only in Zone A"');
      rawMarks.push({ kind: 'spof', node: idTok.text, reason: reasonTok?.type === 'string' ? reasonTok.text : undefined, line });

    // ---- chokepoint ID ["reason"] [badge="92%"]   |   chokepoint A -> B ["reason"] [badge=...]
    } else if (keyword === 'chokepoint') {
      const mark: RawMark = { kind: 'chokepoint', line };
      let i = 0;
      const a = rest[i++];
      if (a?.type !== 'word') return fail(line, 'a chokepoint looks like: chokepoint db "Every write waits for one disk"  (or: chokepoint api -> db "Busy link")');
      if (rest[i]?.type === 'op') {
        const op = rest[i++] as Extract<Token, { type: 'op' }>;
        const b = rest[i++];
        if (op.text !== '->' || b?.type !== 'word') return fail(line, 'to mark a link write: chokepoint a -> b "reason"');
        mark.edgeFrom = a.text; mark.edgeTo = b.text;
      } else mark.node = a.text;
      for (; i < rest.length; i++) {
        const tok = rest[i];
        if (tok.type === 'string' && mark.reason === undefined) mark.reason = tok.text;
        else if (tok.type === 'attr' && tok.key === 'badge') mark.badge = tok.value;
        else return fail(line, 'a chokepoint understands a reason in quotes and badge="92%"');
      }
      rawMarks.push(mark);

    // ---- whatif "Label" fail=GROUP [stops=a,b]
    } else if (keyword === 'whatif') {
      const label = rest[0]?.type === 'string' ? rest[0].text : '';
      const attrs = rest.slice(1);
      let failId = '';
      let stops: string[] = [];
      for (const tok of attrs) {
        if (tok.type === 'attr' && tok.key === 'fail') failId = tok.value;
        else if (tok.type === 'attr' && tok.key === 'stops') stops = tok.value.split(',').map((s) => s.trim()).filter(Boolean);
        else return fail(line, 'a what-if understands fail=GROUP and stops=flow1,flow2');
      }
      if (!label || !failId) return fail(line, 'a what-if looks like: whatif "What if Zone A fails?" fail=za stops=checkout');
      rawWhatifs.push({ label, fail: failId, stops, line });

    // ---- links: a -> b -> c   (a <-> b, a <- b, "label", via=proxy)
    } else if (first.type === 'word' && rest[0]?.type === 'op') {
      let prev = first.text;
      ensureNode(prev, line, true);
      let i = 0;
      while (i < rest.length) {
        const op = rest[i++];
        if (op?.type !== 'op') return fail(line, 'expected -> or <-> between blocks');
        const target = rest[i++];
        if (target?.type !== 'word') return fail(line, 'an arrow must be followed by a block name');
        ensureNode(target.text, line, true);
        const edge: RawEdge = op.text === '<-'
          ? { from: target.text, to: prev, twoWay: false, line }
          : { from: prev, to: target.text, twoWay: op.text === '<->', line };
        while (i < rest.length && rest[i].type !== 'op') {
          const tok = rest[i++];
          if (tok.type === 'string' && edge.label === undefined) edge.label = tok.text;
          else if (tok.type === 'attr' && tok.key === 'label') edge.label = tok.value;
          else if (tok.type === 'attr' && tok.key === 'via') edge.via = tok.value;
          else return fail(line, 'after a link you can add a label in quotes or via=proxyName');
        }
        rawEdges.push(edge);
        prev = target.text;
      }
    } else {
      const word = first.type === 'word' ? first.text : '';
      return fail(line, word
        ? `I do not understand "${word}".${suggest(word, KEYWORDS)} Lines start with ${list(KEYWORDS)}, or are links like: a -> b`
        : 'I do not understand this line');
    }
  });

  // ---- resolve what was declared
  diagram.groups = [...groups.values()];
  for (const g of diagram.groups) {
    if (g.parent !== undefined) {
      const parent = groups.get(g.parent);
      if (!parent) fail(g.line, `the group "${g.id}" is in "${g.parent}", which is not a group.${suggest(g.parent, [...groups.keys()])}`);
      else if (parent.kind === 'zone') fail(g.line, 'a zone cannot contain other groups');
      else if (hasParentCycle(groups, g.id)) fail(g.line, `the group "${g.id}" contains itself`);
    }
  }
  for (const ref of pendingNodeRefs) {
    const group = groups.get(ref.id);
    if (!group) fail(ref.line, `"${ref.id}" is not a group.${suggest(ref.id, [...groups.keys()])}`);
    else if (ref.what === 'zone' && group.kind !== 'zone') fail(ref.line, `"${ref.id}" is a ${group.kind}, not a zone. Use in= for that, and zones= for zones.`);
    else if (ref.what === 'group' && group.kind === 'zone') fail(ref.line, `"${ref.id}" is a zone. Use zones=${ref.id} for that, and in= for a VPC or cluster.`);
  }

  diagram.nodes = [...nodes.values()].sort((a, b) => a.line - b.line);

  const edges: FlowEdge[] = [];
  const addEdge = (raw: RawEdge) => {
    const existing = edges.find((e) => (e.from === raw.from && e.to === raw.to) || (e.twoWay && e.from === raw.to && e.to === raw.from) || (raw.twoWay && e.from === raw.to && e.to === raw.from));
    if (existing) {
      if (raw.twoWay) existing.twoWay = true;
      if (raw.label !== undefined) existing.label = raw.label;
      return existing;
    }
    const edge: FlowEdge = { id: `${raw.from}>${raw.to}`, from: raw.from, to: raw.to, twoWay: raw.twoWay, label: raw.label, line: raw.line };
    edges.push(edge);
    return edge;
  };
  /** links that were written with via=proxy: traffic between the two ends goes through the proxy */
  const viaOf = new Map<string, string>();
  for (const raw of rawEdges) {
    if (raw.via === undefined) { addEdge(raw); continue; }
    const proxy = nodes.get(raw.via);
    if (!proxy) { fail(raw.line, `via=${raw.via} is not a block.${suggest(raw.via, [...nodes.keys()])}`); continue; }
    addEdge({ from: raw.from, to: proxy.id, twoWay: raw.twoWay, label: raw.label, line: raw.line });
    addEdge({ from: proxy.id, to: raw.to, twoWay: raw.twoWay, line: raw.line });
    viaOf.set(`${raw.from}>${raw.to}`, proxy.id);
    if (raw.twoWay) viaOf.set(`${raw.to}>${raw.from}`, proxy.id);
  }
  diagram.edges = edges;

  // flows
  const flows: Flow[] = [];
  rawFlows.forEach((rf, n) => {
    const hops: Flow['hops'] = [];
    let ok = true;
    for (const h of rf.hops) {
      for (const id of [h.from, h.to]) {
        if (!nodes.has(id)) { fail(rf.line, `the flow "${rf.id}" uses "${id}", which is not a block.${suggest(id, [...nodes.keys()])}`); ok = false; }
      }
      if (!ok) break;
      const steps = findEdge(diagram, h.from, h.to) ? [[h.from, h.to]] : (viaOf.has(`${h.from}>${h.to}`) ? [[h.from, viaOf.get(`${h.from}>${h.to}`)!], [viaOf.get(`${h.from}>${h.to}`)!, h.to]] : null);
      if (!steps) { fail(rf.line, `the flow "${rf.id}" goes from "${h.from}" to "${h.to}", but there is no link between them. Add a line like: ${h.from} -> ${h.to}`); ok = false; break; }
      for (const [from, to] of steps) {
        const edge = findEdge(diagram, from, to)!;
        if (h.twoWay && !edge.twoWay) { fail(rf.line, `the flow "${rf.id}" uses <-> from "${from}" to "${to}", but that link is one-way. Declare it with <-> too.`); ok = false; break; }
        hops.push({ edge: edge.id, from, to, twoWay: h.twoWay });
      }
      if (!ok) break;
    }
    if (ok) flows.push({ id: rf.id, label: rf.label, rate: rf.rate, color: rf.color ?? (n % 6) + 1, hops, line: rf.line });
  });
  diagram.flows = flows;

  // marks
  const marks: Mark[] = [];
  for (const rm of rawMarks) {
    if (rm.node !== undefined) {
      if (!nodes.has(rm.node)) { fail(rm.line, `${rm.kind} names "${rm.node}", which is not a block.${suggest(rm.node, [...nodes.keys()])}`); continue; }
      marks.push({ kind: rm.kind, node: rm.node, reason: rm.reason, badge: rm.badge, line: rm.line });
    } else {
      const edge = findEdge(diagram, rm.edgeFrom!, rm.edgeTo!);
      if (!edge) { fail(rm.line, `there is no link from "${rm.edgeFrom}" to "${rm.edgeTo}" to mark`); continue; }
      marks.push({ kind: 'chokepoint', edge: edge.id, reason: rm.reason, badge: rm.badge, line: rm.line });
    }
  }
  diagram.marks = marks;

  // what-ifs
  const whatifs: WhatIf[] = [];
  for (const w of rawWhatifs) {
    if (!groups.has(w.fail)) { fail(w.line, `whatif fail=${w.fail} is not a group.${suggest(w.fail, [...groups.keys()])}`); continue; }
    const unknown = w.stops.find((s) => !flows.some((f) => f.id === s));
    if (unknown) { fail(w.line, `whatif stops=${unknown} is not a flow.${suggest(unknown, flows.map((f) => f.id))}`); continue; }
    whatifs.push({ label: w.label, fail: w.fail, stops: w.stops, line: w.line });
  }
  diagram.whatifs = whatifs;

  if (!diagram.nodes.length && !problems.length) fail(1, 'the diagram is empty. Add a link like: user -> api');
  problems.sort((a, b) => a.line - b.line);
  return { diagram: problems.length ? null : diagram, problems };
}

/** Parses, and throws a FlowSyntaxError (listing every problem with its line) when the text has mistakes. */
export function parse(source: string): Diagram {
  const { diagram, problems } = parseFlow(source);
  if (!diagram) throw new FlowSyntaxError(problems);
  return diagram;
}

/** Just the problems. An empty list means the text is fine. */
export const check = (source: string): Problem[] => parseFlow(source).problems;
