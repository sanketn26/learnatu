import type { Diagram, FlowEdge, FlowGroup, FlowNode } from './types.ts';

/** Small helpers for reading a Diagram. All pure. */

export const nodeById = (d: Diagram, id: string): FlowNode | undefined => d.nodes.find((n) => n.id === id);
export const groupById = (d: Diagram, id: string): FlowGroup | undefined => d.groups.find((g) => g.id === id);

/** The link that carries traffic from `from` to `to`: a one-way link that way, or a two-way link either way. */
export function findEdge(d: Pick<Diagram, 'edges'>, from: string, to: string): FlowEdge | undefined {
  return d.edges.find((e) => (e.from === from && e.to === to) || (e.twoWay && e.from === to && e.to === from));
}

/** A group's id followed by its parents' ids, innermost first. */
export function groupChain(d: Pick<Diagram, 'groups'>, groupId: string | undefined): string[] {
  const chain: string[] = [];
  let current = groupId;
  while (current && !chain.includes(current)) {
    chain.push(current);
    current = d.groups.find((g) => g.id === current)?.parent;
  }
  return chain;
}

/**
 * Which blocks go down when `groupId` fails: blocks that sit inside that group (a VPC, cluster ...) or run only in
 * that zone. Blocks that also run in another zone keep running. Read from what the author wrote.
 */
export function nodesDownWhenFailing(d: Diagram, groupId: string): string[] {
  return d.nodes
    .filter((n) => groupChain(d, n.group).includes(groupId) || (n.zones.length > 0 && n.zones.every((z) => groupChain(d, z).includes(groupId))))
    .map((n) => n.id);
}

/** Text under a block's name: "×3 · cap 200/s". (Zones are shown as a small tag on the block.) */
export function subLabel(d: Diagram, n: FlowNode): string {
  if (n.sub !== undefined) return n.sub;
  const parts: string[] = [];
  if (n.replicas !== undefined) parts.push(`×${n.replicas}`);
  if (n.capacity !== undefined) parts.push(`cap ${n.capacity}/s`);
  return parts.join(' · ');
}
