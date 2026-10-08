# @learnatu/algomap

Step-by-step diagrams of algorithms, written as text. Declare arrays, linked lists, trees and graphs, then write each
step: a caption and what changes. Readers get Previous / Play / Next and a slider.

- **No guessing.** The library never runs your algorithm. Every frame is exactly what your `step` lines say.
- **No dependencies.** Plain TypeScript. The core runs anywhere (build, server, browser, tests); only `dom.ts` needs a browser.
- **Helpful mistakes.** Every problem comes with its line number and often a "Did you mean …?".

```algo
title "Bubble sort, one pass"
array a 5 2 9 1
step "Start at the left. Compare the first two."
  pointer i a[0]
  compare a[0] a[1]
step "5 > 2, so swap them."
  swap a[0] a[1]
step "Compare 5 and 9."
  pointer i a[1]
  compare a[1] a[2]
step "9 > 1, so swap. 9 is now in place."
  pointer i a[2]
  swap a[2] a[3]
  done a[3]
```

## Use it

```ts
import { parse, check, renderSvg, describe } from '@learnatu/algomap';

check(text);                  // [] when the text is fine, otherwise [{ line, message }]
const diagram = parse(text);  // throws AlgoSyntaxError (with .problems) when it is not
diagram.frames;               // frame 0 is the start, then one per step: { caption, line, state }
const svg = renderSvg(diagram, 2, { idPrefix: 'one' });  // SVG string of frame 2
describe(diagram, 2);         // the same frame in plain words, for screen readers
```

In a browser: `import { mountAlgomap } from '@learnatu/algomap/dom'; mountAlgomap(element, text);`

## Colours

The SVG reads `--am-ink`, `--am-muted`, `--am-card`, `--am-line`, `--am-warn`, `--am-brand` (pointers), `--am-focus`, `--am-1` (changed),
`--am-2` (done), `--am-3` (visited) and `--am-font`. It falls back to flowmap's `--fm-*` variables, then the page's `--ink`,
`--muted`, `--surface`, `--line`, then built-in colours.

## The language

One statement per line. `#` starts a comment. Declare everything first, then write steps. Lines under a `step` belong to it.

### Declarations

| Line | Meaning |
| --- | --- |
| `title "Text"` | Title (also the accessible name) |
| `array id v v v … [label="Name"]` | Cells in a row, numbered from 0. `_` is an empty cell. Up to 40 |
| `list id v v v …` | A linked list: `head` first, `null` at the end |
| `stack id v v v …` | Bottom first, drawn upright with `top` marked. May start empty |
| `queue id v v v …` | Front first, with `front` and `back` marked. May start empty |
| `grid id R C [v …] [fill="0"] [rows="a b c"] [cols="x y z"]` | R rows by C columns, values row by row. For DP tables, boards and mazes. Up to 20 x 20 |
| `hash id N [b:value …]` | N buckets (1 to 16), each with a chain: `hash h 5 2:apple 2:fig 4:kiwi` |
| `tree id v v v …` | A binary tree **level by level**: slot `i` has children `2i+1` and `2i+2`. `_` is empty. Up to 63 slots |
| `tree id: 5(2(1 3) 8)` | A tree with its nodes written out. Several trees side by side make a forest (`tree uf: 1(2 3) 4(5)`). `_` inside brackets is an empty child slot; `n1="10 20"` gives a node a short name and a longer label (for B-trees). Up to 60 nodes |
| `trie id word word …` | A trie built from words; the nodes are named by their prefix (`t.ca`) and the top is `t.root` |
| `graph id: a -- b -> c` | Links between named nodes. `--` is plain, `->` is one-way, `-3-` and `-3>` carry a weight. Repeat the line to add more |
| `place g.a x y` | Put a graph node at a position (x right, y down, in steps of about one node). Place every node or none |
| `vars id sum=0 count=0` | A panel of named variables (up to 12). `name=_` starts one unset |

Values with spaces go in quotes: `array w "to be" "or not"`.

### Naming a cell

| Write | Means |
| --- | --- |
| `a[3]`, `a[1..4]` | Cell 3, or cells 1 to 4 (arrays, lists, stacks, queues, level-order trees) |
| `s.top`, `q.front`, `q.back`, `l.head`, `l.tail` | The end of a stack, queue or list |
| `g[1,2]`, `g[0..2,1]`, `g[1,0..3]` | Row, column (a grid) |
| `h[2]`, `h[2:0]` | Bucket 2, or item 0 of its chain |
| `g.a`, `v.sum`, `t.20` | A graph node, a variable, a node of a tree with named nodes |

### Under a step

`step "Caption"` starts a new picture. Short-lived highlights clear at the next `step`; the rest stay until you remove them.

| Line | Meaning | Stays? |
| --- | --- | --- |
| `compare a[0] a[1]` | Amber: being compared | no |
| `focus a[2]`, `focus g.b` | Blue: the one we are looking at | no |
| `swap a[0] a[3]` | Swap two cells; both shown as changed | no |
| `set a[1] 7` | New value in a cell, variable, hash item or tree node label (a level-order tree slot may be past the end) | no |
| `clear t[3]` | Empty a cell or slot | no |
| `append a 7` | Add at the end of an array, list or level-order tree | no |
| `remove a[2]` | Delete from an array, list, stack or queue (later cells shift left), a hash chain (`remove h[1:0]`), or a tree node with everything under it (`remove t.x`) | no |
| `push s 7`, `pop s` | Stack | no |
| `enqueue q 7`, `dequeue q` | Queue | no |
| `insert h[2] apple` | Add to the end of a hash bucket's chain | no |
| `insert t dog` | Add a word to a trie, creating the missing nodes | no |
| `add t.p child` / `add t child` | New node under `p`, or a new root. `child=Label` or `child="10 20"` sets the label; `at=N` picks the child slot | no |
| `move t.x t.p [at=N]` | Move a node, with everything under it, under another node (union in a union-find) | no |
| `detach t.x` | Make a node a root of its own | no |
| `rotate t.y right` / `left` | `y`'s left (right) child takes its place and `y` drops to the other side. Binary trees only | no |
| `path g.a g.b g.c` | Light up the links between nodes of a graph | no |
| `weight g.a g.b 7` | Change a link's weight | yes |
| `done a[2..4]` | Green: finished (a range, or a whole structure `done a`) | yes |
| `visit g.a` | Dashed light blue: visited | yes |
| `unmark a[2]` | Remove `done` / `visit` | |
| `paint t.x red` | Fill a cell or node with `red black blue green orange purple gray` (red-black trees); `_` removes it | yes |
| `tag g.a "0"` | A small note on a cell or node (a distance, a return value); `_` removes it | yes |
| `pointer i a[0]` | A named marker under a cell of an array, list, queue or tree (`i`, `j`, `lo`, `hi`, `mid`). Naming it again moves it | yes |
| `unpointer i a` | Remove the pointer | |
| `reset` / `reset a` | Remove all `done` / `visit` marks and pointers (of everything, or of `a`) | |

Tag, paint and weights stay until you change them, and `reset` leaves them alone.

### Recipes

- **Recursion:** a node-link tree for the calls (`add calls.fib4 fib3`, `focus`, `tag calls.fib2 "1"` for the return value) next to a `stack` for the call stack (`push`, `pop`).
- **Dijkstra / BFS:** a weighted `graph`, `tag g.b "5"` for each distance, `visit` for settled nodes, `path` for the edge being relaxed.
- **Union-find:** `tree uf: 1 2 3 4`, then `move uf.2 uf.1`; `tag` can show ranks.
- **AVL / red-black:** `tree t: 10(_ 20(_ 30))`, `rotate t.10 left`, `paint t.20 black`.
- **N-Queens, DP, grid paths:** a `grid`, `set g[r,c] Q`, `focus`, `done`, `compare`.
- **Counters and accumulators:** `vars v sum=0`, `set v.sum 14`.
