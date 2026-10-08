/** The shapes of data algomap works with. Everything here is plain data, so it is easy to print and to test. */

export const STRUCT_KINDS = ['array', 'list', 'stack', 'queue', 'grid', 'hash', 'tree', 'ntree', 'trie', 'graph', 'vars'] as const;
export type StructKind = (typeof STRUCT_KINDS)[number];

/** A mistake in the text, with the line it is on (1 = first line of the block). */
export interface Problem { line: number; message: string }

export interface GraphEdge { from: number; to: number; directed: boolean; weight?: string }
export interface Point { x: number; y: number }

/**
 * A tree whose nodes are written out (`tree t: 5(2 8)`, `trie`), as opposed to a level-order `tree`.
 * Nodes are numbered in the order they were created and never renumbered. `children[i]` lists a node's child slots
 * left to right; -1 is an empty slot (a missing left child, say). `roots` is a list because a forest has several.
 */
export interface NTree {
  ids: string[];
  /** Index of every node in `ids`; a removed node has a null label in the state's `values`. */
  children: number[][];
  roots: number[];
  /** Nodes that end a word (tries). */
  terminal: number[];
}

/**
 * A data structure as declared.
 *  array, list, stack, queue, tree  `values` are the cells (stack: bottom first; queue: front first; tree: level-order slots)
 *  grid                             `values` are the cells row by row, `rows` x `cols`
 *  hash                             `chains[b]` is the list of items in bucket b
 *  ntree, trie                      `ntree` holds the nodes, `values` their labels
 *  graph                            `values` are the node names
 *  vars                             `values` are the variable names and `init` their starting values
 */
export interface Structure {
  id: string; kind: StructKind; label?: string; line: number;
  values: (string | null)[];
  edges: GraphEdge[];
  rows?: number; cols?: number; rowNames?: string[]; colNames?: string[];
  chains?: string[][];
  ntree?: NTree;
  init?: (string | null)[];
  /** Fixed node positions for a graph, in grid units. */
  positions?: (Point | null)[];
}

/** Short-lived highlights, cleared at the start of every step. */
export type Flash = 'compare' | 'focus' | 'changed';
/** Highlights that stay until the author removes them. */
export type Kept = 'done' | 'visit';

export const PAINTS = ['red', 'black', 'blue', 'green', 'orange', 'purple', 'gray'] as const;
export type Paint = (typeof PAINTS)[number];

/**
 * What one structure looks like at one moment. Highlights are keyed by the number of a cell, slot or node.
 * A hash table's bucket b is key b*100, and item k of its chain is key b*100+1+k.
 */
export interface StructState {
  values: (string | null)[];
  flash: Record<number, Flash>;
  kept: Record<number, Kept>;
  /** Named markers such as i, j, lo, hi, each on one cell. */
  pointers: Record<string, number>;
  /** Graph links lit up this step, as "from>to" node indexes. */
  paths: string[];
  /** Small notes on a cell or node (a distance, a return value). */
  tags: Record<number, string>;
  paint: Record<number, Paint>;
  chains?: string[][];
  ntree?: NTree;
  /** Graph link weights changed by the author, keyed "from>to". */
  weights?: Record<string, string>;
}

/** One picture: the caption the author wrote and the state of every structure. */
export interface Frame { caption: string; line: number; state: Record<string, StructState> }

export interface Diagram {
  title?: string;
  structures: Structure[];
  /** Frame 0 is the starting state; there is one more frame for each `step`. */
  frames: Frame[];
}

/** Thrown by `parse` when the text has mistakes. `problems` lists all of them. */
export class AlgoSyntaxError extends Error {
  problems: Problem[];
  constructor(problems: Problem[]) {
    super(problems.map((p) => `line ${p.line}: ${p.message}`).join('\n'));
    this.name = 'AlgoSyntaxError';
    this.problems = problems;
  }
}
