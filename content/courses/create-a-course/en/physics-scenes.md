---
title: Physics scenes
summary: Show bodies, forces, springs and motion over time, with sliders readers can move
minutes: 15
objectives:
  - Write a scene with a body, gravity, a spring or a rod
  - Give the reader sliders and graphs
  - Read the messages the checker gives for wrong units
---

A **physics scene** shows things moving under forces. Readers press Play, drag the time slider, and move the sliders you offer, such as the mass or the stiffness of a spring. You write it as text in a fenced block tagged `phys`.

The scene is a picture of an idealised model, not an engineering answer. It never guesses: you state the numbers and the checker makes sure the units make sense.

## 1. A ball thrown into the air

Every scene starts with the kind of scene. This lesson uses `mechanics`. Then say how strong gravity is, add a **body**, and say how long to **run**.

````markdown
```phys
scene mechanics
title "A throw"
gravity earth
body ball mass=0.2kg at=(0m,0m) speed=20m/s angle=45deg
ground y=0m bounce=0
run 3s
show velocity
trail ball
plot ball.y
```
````

```phys
scene mechanics
title "A throw"
gravity earth
body ball mass=0.2kg at=(0m,0m) speed=20m/s angle=45deg
ground y=0m bounce=0
run 3s
show velocity
trail ball
plot ball.y
```

- Every number has a **unit**: `0.2kg`, `20m/s`, `45deg`. A position is two numbers in brackets, `(x,y)`, with y pointing up.
- `gravity earth` also accepts `moon`, `mars`, `jupiter` or your own value, `gravity 9.8m/s2`.
- `show velocity` draws an arrow on the body, `trail` leaves its path, `plot` adds a graph with a moving cursor under the picture.

## 2. Sliders: let the reader explore

A `param` line makes a slider. Write a name, a range, a unit and where it starts, then use it with a `$`.

````markdown
```phys
scene mechanics
title "Mass on a spring"
assume "no friction, a perfect spring"
param k 10..100 N/m start=40 label="Spring stiffness"
param mass 0.5..5 kg start=2 label="Mass"
body block mass=$mass at=(0.6m,0m)
spring k=$k from=(0m,0m) to=block rest=0.4m
run 6s
plot block.x
plot ke pe energy
note 0s "Pulled out to the right and let go."
note 1.5s "Moving fastest as it passes the rest position."
predict "What happens to the time of one swing if the mass doubles?" answer="It gets about 41% longer. The time of a swing grows with the square root of the mass."
```
````

```phys
scene mechanics
title "Mass on a spring"
assume "no friction, a perfect spring"
param k 10..100 N/m start=40 label="Spring stiffness"
param mass 0.5..5 kg start=2 label="Mass"
body block mass=$mass at=(0.6m,0m)
spring k=$k from=(0m,0m) to=block rest=0.4m
run 6s
plot block.x
plot ke pe energy
note 0s "Pulled out to the right and let go."
note 1.5s "Moving fastest as it passes the rest position."
predict "What happens to the time of one swing if the mass doubles?" answer="It gets about 41% longer. The time of a swing grows with the square root of the mass."
```

- `note 1.5s "…"` changes the caption from that moment on, so the words follow the motion.
- `predict` asks the reader to guess first. The answer stays hidden until they open it.
- `assume` is printed under the figure. Say what you left out.
- On one `plot` line, put only things measured in the same unit: `plot ke pe energy` works, `plot block.x block.speed` is a mistake.

## 3. A pendulum with a rod

A `rod` joins a body to a fixed point and keeps the distance. Bodies can also have drag, which slows them.

````markdown
```phys
scene mechanics
title "A pendulum"
assume "a very stiff rod with no mass, no air resistance"
param g 1.6..24 m/s2 start=9.8 label="Gravity"
gravity $g
body bob mass=1kg at=(0.9m,1.6m)
rod from=(0m,2.5m) to=bob
run 8s
trail bob
plot bob.x
```
````

```phys
scene mechanics
title "A pendulum"
assume "a very stiff rod with no mass, no air resistance"
param g 1.6..24 m/s2 start=9.8 label="Gravity"
gravity $g
body bob mass=1kg at=(0.9m,1.6m)
rod from=(0m,2.5m) to=bob
run 8s
trail bob
plot bob.x
```

Drag the gravity slider from the Moon to Jupiter and watch how the swing changes.

## 4. Your own pictures

If you have a photo or drawing, put it in the course folder like any other image. Place it behind the physics with `backdrop`, saying where its bottom-left corner is and how big it is in metres, or draw a body as a picture with `sprite`.

````markdown
```phys
scene mechanics
backdrop "images/ramp.png" from=(0m,0m) size=(4m,2m)
body cart mass=1kg at=(0.4m,1.6m) sprite="images/cart.png" radius=0.15m
gravity earth
run 2s
```
````

The checker tells you if a picture is not in the course. Write the path the way you would in a Markdown image.

## 5. When something is wrong

The checker gives the line and what to do about it.

- `mass=3m` → *mass needs a mass, but "3m" is a length.*
- `mass=3` → *mass needs a mass, so write a unit, for example 3kg.*
- `body b mas=1kg …` → *"body" has no property "mas". Did you mean "mass"?*
- A spring pulled so far that it would pass through its own anchor → *this spring gets squashed to almost nothing, which a real spring cannot do.*

## What a mechanics scene can and cannot do

It shows point masses and discs, gravity, springs, rods, drag, floors, ramps with friction, and collisions, in a flat plane. It does **not** model rotation of extended bodies, fluids, friction that depends on speed, or anything solved with calculus on the page. When your model leaves something out, say so with `assume`.

The next lessons add ramps, friction and collisions, and then other kinds of scene: waves, rays, fields, heat, circuits, relativity and a single qubit. They all start with `scene …`, and they all share the rules you have just used: units, sliders with `param`, and `predict`.

## What to remember

- Start with `scene mechanics`. Every number has a unit. Positions are `(x,y)`.
- `param` makes a slider and `$name` uses it. `run` says how long. `plot`, `show`, `trail` and `note` decide what the reader sees.
- Use `assume` to say what the picture leaves out, and `predict` to make readers think first.

```quiz
type: single
question: You want the mass in your scene to be adjustable by the reader. What do you write?
options:
  - mass=2kg
  - param mass 0.5..5 kg start=2   and then   mass=$mass
  - slider mass 0.5..5
  - mass=0.5..5kg
answer: 1
explain: A param line declares the slider with its range, unit and starting value. Using $mass later connects the body to it.
```
