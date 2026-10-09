# @learnatu/physmap

Visual physics scenes, written as text. A teacher writes a fenced `phys` block in a lesson; readers get a picture they can
play, scrub through and change with sliders. Eight kinds of scene share one set of rules.

The goal is **visual understanding**, not computation. It draws idealised models clearly; it is not a physics engine.

- **Units are checked.** Every number carries a unit. `mass=3m` is a mistake with a line number, not a wrong picture.
- **Honest.** `assume "..."` is printed under the figure. The language knows what each kind of scene cannot do and refuses
  to draw it: polarised sound, a worldline faster than light, two entangled qubits, a moving source of light.
- **Numbers from the laws.** Each scene computes from the real formulas (Newton, Snell, Coulomb, ideal gas, Ohm, Lorentz),
  and the tests check them against textbook answers.
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

## The eight scenes

Every block starts with `scene <kind>`. The playground (`/author/playground/`) has a working example of each.

| Scene | Shows | Cannot do |
|---|---|---|
| `mechanics` | Bodies, gravity, springs, rods, drag, floors, ramps with friction, collisions; free-body diagrams; plots of position, velocity, energy, momentum | Rotation of extended bodies, fluids, speed-dependent friction, 3D |
| `wave` | Rings from point sources, interference, the Doppler effect and shock cones, probes; fringes from slits. Light and sound, by `medium` | Polarisation, reflection from surfaces, 3D waves |
| `ray` | An object with a thin lens or a mirror: principal rays and the image; a beam crossing a boundary: Snell's law, total internal reflection | Thick lenses, aberrations, dispersion |
| `field` | Electric field of point charges or gravitational field of point masses: arrows, field lines, potential, a probe | Moving charges, magnetism, mixing the two |
| `cycle` | An ideal gas through isothermal, isobaric, isochoric and adiabatic processes on a p-V diagram; Q, W, ΔU per process; efficiency | Real gases, phase changes, irreversible processes |
| `circuit` | A battery with resistors in series and parallel, current as moving dots, a charging capacitor | Several loops, inductors, AC |
| `spacetime` | Events, worldlines, light cones, a moving observer (boost slider), simultaneity, time dilation, the interval | Gravity, acceleration, curved spacetime |
| `bloch` | One qubit on the Bloch sphere, gates as rotations, measurement odds | More than one qubit |

## Rules every scene shares

One statement per line. `#` starts a comment. Spaces inside brackets are fine: `(0m, 1m)`.
Everything is converted to SI (metres, kilograms, seconds, amperes, kelvin) when read.

| Line | Meaning |
|---|---|
| `scene <kind>` | First line. |
| `title "..."`, `assume "..."` | Caption, and what the picture leaves out (repeatable). |
| `param name lo..hi unit start=N label="..."` | A slider. Use it anywhere a number goes, as `$name`. Declare it before using it. |
| `predict "question" answer="..."` | The reader guesses first; the answer is revealed on request. |
| `note <time> "..."` | A caption that follows the motion (in mechanics, wave and cycle). |

Units: `m kg g s N J W Hz A C V ohm F K Pa L rad deg yr ly AU c`, with `G M k c m u n p` in front of the ones that take a
prefix (`kg`, `cm`, `ms`, `uF`, `nm`, `kohm`, `MHz` ...). Compound: `m/s`, `m/s2`, `N/m`, `kg*m/s2`. `c` is the speed of
light (`0.6c`), `ly` and `yr` are for spacetime scenes.

## Taking control of the picture

The package works out a sensible picture (the part of the world to show, the words under it). Where a scene allows it,
the text can say exactly what it wants instead. These lines are only accepted by the scenes that list them; any other
scene says it does not know the word.

| Line | Scenes | Meaning |
| --- | --- | --- |
| `view x=0m..10m y=0m..4m` | mechanics, ray (lens and mirror) | The part of the world to draw. Either axis may be left out and is then worked out. For a ray scene the axis runs through the middle, so `y` is the larger of the two numbers either side |
| `caption "text"` | ray | Your words under the picture, in place of the generated ones |
| `allow squashed` | mechanics | Turn off the check that stops a spring being squeezed to almost nothing, when you want that on purpose |

`check` tries every slider at its low end, its high end, and every mix of the two (up to four sliders; a fixed spread
of sixteen beyond that). A problem is reported on the `param` line of the slider that was moved, with the setting that
caused it.

## Mechanics

| Line | Meaning |
|---|---|
| `body id mass= at=(x,y) [v=(vx,vy)] [speed= angle=] [slide=] [radius=] [sprite="img"]` | A point mass or disc. `speed`+`angle` replace `v`. `slide=` starts it on the first ramp. |
| `gravity earth` / `moon` / `mars` / `jupiter` / `9.8m/s2` / `$g` | Downwards. Without it there is no gravity. |
| `spring k= from= to= rest=` | Ends are `(x,y)` points or body names; at least one is a body. |
| `rod from= to=` | Keeps a body at a fixed distance from a point (a pendulum). |
| `drag body c=0.2kg/s` | Force against velocity. |
| `ground [y=0m] [bounce=] [friction=]` | An endless floor. |
| `incline from=(x,y) angle= length= [bounce=] [friction=]` | A ramp. |
| `collide [bounce=1]` | Discs bounce off each other (needs `radius` on every body). |
| `run 10s` | How long. Required. |
| `plot b.x` `plot ke pe energy` | A graph per line; everything on one line must share a unit. Per body: `x y vx vy speed ke px py normal friction`; scene-wide: `ke px py pe energy`. |
| `show velocity weight normal friction force [bodies]` | Lettered arrows (v, W, N, f, F) on one shared scale. |
| `trail [bodies]`, `backdrop "img" from=(x,y) size=(w,h)` | The path so far; the author's picture behind the physics. |

## Waves

`medium air|water|steel|vacuum|glass`, then either point sources or slits.
`source s at=(x,y) f=440Hz [phase=] [v=(vx,vy)]`, `probe p at=(x,y)`, `plot p`, `run 6periods`,
or `slits d=0.2mm [width=0.02mm] wavelength=550nm`, `screen at=1.5m`.

## Rays

`object at=-20cm height=3cm`, then `lens at=0cm f=8cm` or `mirror at=0cm f=6cm` (negative `f`: diverging or convex),
optionally `screen at=…`. Or `beam angle=30deg n1=1 n2=1.5`.

## Fields

`charge q1 at=(x,y) q=2nC` or `mass m1 at=(x,y) m=5.97e24kg`, `probe p at=(x,y)`, `show lines arrows potential`, `window 3m`.

## Cycles

`gas moles=1 p=100kPa T=300K [gamma=1.4]` (any two of p, v, T), then `process isothermal|isobaric|isochoric|adiabatic v=… | p=… | T=…`.

## Circuits

`battery 9V`, `resistor R1 100ohm`, `lamp L1 50ohm`, `capacitor C1 10uF`, groups between `parallel` and `end`, `run 5ms`.

## Spacetime

`event A at=(0yr,0ly)` (time, place), `worldline W from=A to=B`, `clock C from=A v=0.6c ticks=1yr`, `frame S2 v=$v`,
`show lightcone|simultaneity A`, `measure A B`.

## One qubit

`state |0>` (also `|1> |+> |-> |i> |-i>` or `theta=60deg phi=30deg`), `step "caption"`, `gate H` (also `X Y Z S T Sdg Tdg`,
and `Rx Ry Rz angle=90deg`), `measure z|x|y`.

## Use it

```ts
import { parse, check } from '@learnatu/physmap';

check(text);                          // [] when the scene is fine, otherwise [{ line, message }]
const scene = parse(text);            // throws PhysSyntaxError (with .problems) when it is not
const run = scene.run({ k: 60 });     // sliders by name, in SI units; left out ones use their start value
run.count;                            // how many moments the time slider has (1 = does not change with time)
const svg = run.svg(120, { idPrefix: 'one', resolveImage: (ref) => `/media/${ref}` });
run.caption(120);                     // the words under the picture
run.describe(120);                    // the same moment in plain words, for screen readers
```

Add a kind of scene with one entry: write `scene-<name>.ts` (a parser and an `INFO`), add it to the list in
`src/kinds.ts`, and add an example. `registerKind` adds one at run time.

Pass `{ hasImage }` to `check` to confirm that backdrops and sprites exist. `EXAMPLES` lists a working scene for each kind,
`KIND_INFO` the one-line summary, limits and words of each. The raw mechanics numbers (`simulate`, `renderSvg`) are in
`@learnatu/physmap/mechanics`.
In a browser: `import { mountPhysmap } from '@learnatu/physmap/dom'; const m = mountPhysmap(element, text);` and `m.destroy()`
before reusing the element.
