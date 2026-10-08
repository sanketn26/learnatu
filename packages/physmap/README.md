# @learnatu/physmap

Visual physics scenes, written as text. Declare bodies, gravity, springs and rods, say how long to run, and readers get a
time slider, Play, graphs with a moving cursor, and any sliders you declare (mass, stiffness, gravity...).

The goal is **visual understanding**, not computation. It draws idealised models clearly; it is not a physics engine.

- **Units are checked.** Every number carries a unit. `mass=3m` is a mistake with a line number, not a wrong picture.
- **Honest.** `assume "..."` is printed under the figure. A scene that runs away (a very light mass on a very stiff spring) or squashes a spring through its anchor fails the check.
- **No dependencies.** Plain TypeScript. The core runs anywhere (build, server, browser, tests); only `dom.ts` needs a browser.
- **Helpful mistakes.** Every problem comes with its line number and often a "Did you mean ...?".

```phys
scene mechanics
title "Mass on a spring"
assume "no friction, a perfect spring"
param k 10..100 N/m start=40 label="Spring stiffness"
param mass 0.5..5 kg start=2
body block mass=$mass at=(0.6m,0m)
spring k=$k from=(0m,0m) to=block rest=0.4m
run 6s
plot block.x
plot ke pe energy
note 0s "Pulled out to the right and let go."
predict "What happens if the mass doubles?" answer="The swing takes about 41% longer."
```

## The language

One statement per line. `#` starts a comment. Spaces inside brackets are fine: `(0m, 1m)`.
Everything is in SI after reading: metres, kilograms, seconds. Positions are `(x,y)` with y up.

| Line | Meaning |
|---|---|
| `scene mechanics` | First line. Other scenes (`wave`, `ray`, `spacetime`...) are planned and say so if you try them. |
| `title "..."`, `assume "..."` | Caption, and what the picture leaves out (repeatable). |
| `param name lo..hi unit start=N label="..."` | A slider. Use it anywhere a number goes, as `$name`. Declare it before using it. |
| `body id mass= at=(x,y) [v=(vx,vy)] [speed= angle=] [radius=] [sprite="img"]` | A point mass. `speed`+`angle` replace `v`. |
| `gravity earth` / `moon` / `mars` / `jupiter` / `9.8m/s2` / `$g` | Downwards. Without it there is no gravity. |
| `spring k= from= to= rest=` | Ends are `(x,y)` points or body names; at least one is a body. |
| `rod from= to=` | Keeps a body at a fixed distance from a point (a pendulum). A very stiff spring underneath. |
| `drag body c=0.2kg/s` | Force against velocity. |
| `ground [y=0m] [bounce=0..1]` | A floor. No friction. |
| `run 10s` | How long. Required. |
| `plot b.x` `plot ke pe energy` | A graph per line. Everything on one line must share a unit. Quantities: `x y vx vy speed ke` per body (`ke` also for the whole scene) and `pe energy` for the scene. |
| `show velocity [bodies]` / `show force [bodies]` | Arrows, scaled to the largest value over the run. |
| `trail [bodies]` | The path so far. |
| `note 2s "..."` | The caption from that moment on. |
| `predict "question" answer="..."` | Reader guesses first; the answer is revealed on request. |
| `backdrop "img.png" from=(x,y) size=(w,h)` | The author's picture behind the physics, placed in metres. |

Units: `m kg g s N J W Hz rad deg`, with `k`, `c` or `m` in front of `m s N J W g`. Compound: `m/s`, `m/s2`, `N/m`, `kg*m/s2`.

## What it can and cannot do

Can: point masses, gravity, springs, rods, linear drag, a bouncing ground, in a plane; energy, position, velocity and force
over time; sliders that re-run the scene.

Cannot (by design): collisions between bodies, ground friction, rotation of extended bodies, fluids, fields, waves, light,
relativity, quantum states. Several of these are planned as their own scenes. It integrates with fixed small steps
(Runge-Kutta, 1 ms) and is for pictures of idealised systems, not engineering answers.

## Use it

```ts
import { parse, check, simulate, renderSvg, describe } from '@learnatu/physmap';

check(text);                          // [] when the scene is fine, otherwise [{ line, message }]
const model = parse(text);            // throws PhysSyntaxError (with .problems) when it is not
const sim = simulate(model, { k: 60 }); // sliders by name, in SI units
sim.samples;                          // { t, b: [[x, y, vx, vy, fx, fy, ke], ...], pe, energy }
const svg = renderSvg(model, sim, 120, { idPrefix: 'one', resolveImage: (ref) => `/media/${ref}` });
describe(model, sim, 120);            // the same moment in plain words, for screen readers
```

Pass `{ hasImage }` to `check` to confirm that backdrops and sprites exist.
In a browser: `import { mountPhysmap } from '@learnatu/physmap/dom'; mountPhysmap(element, text);`
