/** The shapes of data flowmap works with. Everything here is plain data, so it is easy to print and to test. */

export const NODE_KINDS = ['client', 'service', 'gateway', 'cache', 'database', 'document', 'storage', 'disk', 'queue', 'stream', 'worker', 'external', 'ingress', 'egress', 'proxy'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

/** Other names people use for a kind. `node k "Events" kafka` is the same as `stream`. */
export const NODE_KIND_ALIASES: Record<string, NodeKind> = {
  kafka: 'stream', kinesis: 'stream', eventstream: 'stream', topic: 'stream',
  mongodb: 'document', documentdb: 'document', docstore: 'document',
  files: 'storage', fileserver: 'storage', bucket: 'storage', s3: 'storage', objectstore: 'storage',
  volume: 'disk', drive: 'disk', ssd: 'disk', nfs: 'disk'
};

export const GROUP_KINDS = ['vpc', 'subnet', 'cluster', 'namespace', 'region', 'layer', 'zone'] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

export type Direction = 'right' | 'down';
export type Speed = 'slow' | 'normal' | 'fast';

/** A mistake in the text, with the line it is on (1 = first line of the block). */
export interface Problem { line: number; message: string }

export interface FlowGroup { id: string; label: string; kind: GroupKind; parent?: string; line: number }

export interface FlowNode {
  id: string; label: string; kind: NodeKind; line: number;
  replicas?: number; capacity?: number;
  /** The (non-zone) group this block sits in, for example a VPC or a cluster. */
  group?: string;
  /** Zone groups the block runs in. */
  zones: string[];
  sidecar?: string;
  /** Text under the name; built from replicas, capacity and zones unless written with sub="...". */
  sub?: string;
}

export interface FlowEdge {
  id: string; from: string; to: string; twoWay: boolean; label?: string; line: number;
}

/** One step of a flow, tied to a link. `from`/`to` say which way the traffic goes along it. */
export interface FlowHop { edge: string; from: string; to: string; twoWay: boolean }

export interface Flow { id: string; label: string; rate?: number; color: number; hops: FlowHop[]; line: number }

/** A problem area the author named. Nothing is ever worked out by the library. */
export interface Mark {
  kind: 'spof' | 'chokepoint';
  node?: string; edge?: string;
  reason?: string; badge?: string; line: number;
}

export interface WhatIf { label: string; fail: string; stops: string[]; line: number }

export interface Diagram {
  title?: string;
  direction: Direction;
  speed: Speed;
  nodes: FlowNode[];
  groups: FlowGroup[];
  edges: FlowEdge[];
  flows: Flow[];
  marks: Mark[];
  whatifs: WhatIf[];
}

export interface Point { x: number; y: number }
export interface Cubic { p1: Point; c1: Point; c2: Point; p2: Point }
export interface Rect { x: number; y: number; w: number; h: number }

/** Thrown by `parse` when the text has mistakes. `problems` lists all of them. */
export class FlowSyntaxError extends Error {
  problems: Problem[];
  constructor(problems: Problem[]) {
    super(problems.map((p) => `line ${p.line}: ${p.message}`).join('\n'));
    this.name = 'FlowSyntaxError';
    this.problems = problems;
  }
}
