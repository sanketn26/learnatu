# @learnatu/flowmap

Animated block diagrams of data flow, written as text. Built for lessons: traffic moves along the links, and the
author marks the single points of failure and chokepoints.

- **No guessing.** The library never decides what is a problem. A block is marked only where you write `spof` or
  `chokepoint`. `replicas=` and `capacity=` are labels, not inputs to any calculation.
- **No dependencies.** Plain TypeScript. The core runs anywhere (build, server, browser, tests); only `dom.ts` needs a browser.
- **Helpful mistakes.** Every problem comes with its line number and often a "Did you mean …?".

```flow
group vpc "Production VPC" vpc
group za "Zone A" zone
node customer "Customer" client
node api "API" service replicas=3 capacity=200 in=vpc zones=za
node db "Orders DB" database capacity=65 in=vpc zones=za
customer -> api <-> db "SQL"
flow order "Place an order" rate=60: customer -> api <-> db
spof db "One copy, and only in Zone A"
chokepoint api -> db "Every write waits here" badge="92%"
whatif "What if Zone A fails?" fail=za stops=order
```

## Use it

```ts
import { parse, check, renderSvg } from '@learnatu/flowmap';

check(text);                 // [] when the text is fine, otherwise [{ line, message }]
const diagram = parse(text); // throws FlowSyntaxError (with .problems) when it is not
const svg = renderSvg(diagram, { animate: true, idPrefix: 'one' });  // an SVG string
```

In a browser, add the live controls (pause, show problems, flow buttons, what-if, legend, findings list):

```ts
import { mountFlowmap } from '@learnatu/flowmap/dom';
mountFlowmap(document.querySelector('#here'), text);
```

Other exports: `describe(diagram)` (a plain-words summary for screen readers), `layout(diagram)` (positions),
`nodesDownWhenFailing(diagram, groupId)`.

## Colours

The SVG reads CSS variables and falls back to the page's `--ink`, `--muted`, `--surface`, `--line`, then to built-in
colours. Set these to match your page: `--fm-ink`, `--fm-muted`, `--fm-card`, `--fm-line`, `--fm-bad`, `--fm-warn`,
`--fm-brand`, `--fm-flow-1` … `--fm-flow-6`, `--fm-font`.

## The language

One statement per line. `#` starts a comment.

| Line | Meaning |
| --- | --- |
| `title "Text"` | Title (also the accessible name) |
| `direction right` / `down` | Reading direction. Default `right` |
| `speed slow` / `normal` / `fast` | Dot speed |
| `group id "Label" kind [in=group]` | A group. Kinds: `vpc subnet cluster namespace region layer zone`. Zones are tags, not boxes |
| `node id "Label" kind [replicas=N] [capacity=N] [in=group] [zones=a,b] [sidecar=text] [sub="text"]` | A block. Kinds: `client service gateway cache database storage queue worker external ingress egress proxy` (default `service`) |
| `a -> b -> c`, `a <-> b`, `a <- b` | Links. Unknown names become blocks. After a link: `"label"` or `via=proxy` |
| `flow id "Label" [rate=N] [color=1-6]: a -> b <-> c` | Traffic along links that exist. `<->` sends a reply back |
| `spof id "reason"` | Mark a single point of failure |
| `chokepoint id "reason" [badge="text"]` | Mark a chokepoint on a block |
| `chokepoint a -> b "reason" [badge="text"]` | Mark a chokepoint on a link |
| `whatif "Label" fail=group [stops=flow,flow]` | A button that fails a group: blocks that live only there fade, listed flows stop |

`via=proxy` on a link inserts the proxy block between the two ends, and flows follow it. A flow may only use links
that exist; `<->` in a flow needs a `<->` link.

## How it is organised

| File | Job |
| --- | --- |
| `types.ts` | The data shapes |
| `tokenize.ts` | One line to tokens |
| `parse.ts` | Text to a `Diagram`, with every problem and its line |
| `model.ts` | Small read-only helpers (find a link, what fails with a group) |
| `layout.ts` | Positions: columns by distance along the flow, groups kept together, curves between sides |
| `render.ts` | `Diagram` to an SVG string, including the animation |
| `dom.ts` | Browser controls |

Tests: `npm test` from the repository root runs `packages/flowmap/tests/`.
