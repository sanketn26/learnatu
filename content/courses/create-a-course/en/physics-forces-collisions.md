---
title: Ramps, friction and collisions
summary: Free-body diagrams on a ramp, sliding to a stop, and momentum in a collision
minutes: 15
objectives:
  - Draw the forces on a block with show weight, normal and friction
  - Put a block on a ramp and let readers change the angle and the friction
  - Show that momentum is conserved in a collision, and that energy is not always
---

The first physics lesson used a ball, a spring and a pendulum. Real mechanics problems also have **surfaces**, **friction** and **bodies that hit each other**. This lesson adds them.

## 1. A block on a ramp

An `incline` is a ramp that starts at a point, rises at an angle and has a length. A body can start on it with `slide=5m`, meaning "5 metres up the ramp from its foot", so the block still sits on the ramp when the reader changes the angle.

`show weight normal friction force` draws the four forces, each labelled with a letter: **W** weight, **N** the normal force from the ramp, **f** friction, and **F** the net force. They all share one scale, so the lengths can be compared.

````markdown
```phys
scene mechanics
title "Forces on a block on a ramp"
gravity earth
param angle 5..60 deg start=30 label="Angle of the ramp"
param mu 0..1 start=0.2 label="Friction"
incline from=(0m,0m) angle=$angle length=6m friction=$mu
ground y=0m friction=$mu
body block mass=2kg slide=5m
run 4s
show weight normal friction force
plot block.speed
assume "a block with a flat face, a ramp that is rigid, friction that does not depend on speed"
predict "How steep must the ramp be before the block slides, if friction is 0.2?" answer="When tan of the angle is bigger than the friction coefficient: about 11 degrees."
```
````

```phys
scene mechanics
title "Forces on a block on a ramp"
gravity earth
param angle 5..60 deg start=30 label="Angle of the ramp"
param mu 0..1 start=0.2 label="Friction"
incline from=(0m,0m) angle=$angle length=6m friction=$mu
ground y=0m friction=$mu
body block mass=2kg slide=5m
run 4s
show weight normal friction force
plot block.speed
assume "a block with a flat face, a ramp that is rigid, friction that does not depend on speed"
predict "How steep must the ramp be before the block slides, if friction is 0.2?" answer="When tan of the angle is bigger than the friction coefficient: about 11 degrees."
```

- `friction=$mu` is a coefficient with no unit: 0 is ice, 0.8 is rubber on dry concrete.
- The ground at the bottom lets the block slide onto the floor instead of falling off the end of the ramp.
- The checker rejects an `incline` with angle 0 (use `ground` for a flat floor), and `show normal` when there is nothing to rest on.

Try it: raise the friction until the block no longer slides. It stops sliding exactly when friction reaches the tangent of the angle.

## 2. Sliding to a stop

Friction works on the floor too. With `ground y=0m friction=0.25` a sliding body slows steadily and stops, after a distance of v² ÷ (2 μ g).

```phys
scene mechanics
title "Friction brings a sliding box to rest"
gravity earth
param mu 0.05..0.8 start=0.25 label="Friction"
ground y=0m friction=$mu
body box mass=5kg at=(0m,0m) v=(6m/s,0m/s)
run 8s
show velocity friction
plot box.vx
```


## 3. Two carts colliding

Give bodies a **radius** and turn on `collide`. `bounce=1` is a perfectly elastic collision and `bounce=0` is a collision where the carts stick together. `plot px` draws the total momentum, and `plot ke` the total kinetic energy.

````markdown
```phys
scene mechanics
title "Momentum in a collision"
param m2 0.5..5 kg start=1 label="Mass of the second cart"
param e 0..1 start=1 label="Bounciness (1 = elastic, 0 = they stick)"
collide bounce=$e
body red mass=1kg at=(0m,0.1m) v=(2m/s,0m/s) radius=0.1m
body blue mass=$m2 at=(1.5m,0.1m) radius=0.1m
run 3s
show velocity
plot px
plot ke
note 0s "The red cart moves toward the blue one."
predict "What stays the same in every collision, whatever the bounciness?" answer="The total momentum. The kinetic energy is only conserved when the collision is perfectly elastic."
```
````

```phys
scene mechanics
title "Momentum in a collision"
param m2 0.5..5 kg start=1 label="Mass of the second cart"
param e 0..1 start=1 label="Bounciness (1 = elastic, 0 = they stick)"
collide bounce=$e
body red mass=1kg at=(0m,0.1m) v=(2m/s,0m/s) radius=0.1m
body blue mass=$m2 at=(1.5m,0.1m) radius=0.1m
run 3s
show velocity
plot px
plot ke
note 0s "The red cart moves toward the blue one."
predict "What stays the same in every collision, whatever the bounciness?" answer="The total momentum. The kinetic energy is only conserved when the collision is perfectly elastic."
```

- Total momentum stays flat whatever the bounciness. Kinetic energy only stays flat when `bounce=1`.
- Write `plot red.px blue.px` to see the momentum passing from one cart to the other.

## What to remember

- `incline` and `ground` can both have `friction=`. `slide=` starts a body on a ramp.
- `show weight normal friction force` makes a free-body diagram with lettered arrows.
- `collide bounce=…` needs every body to have a `radius`.

```quiz
type: single
question: In the collision scene, the readers move the bounciness slider from 1 down to 0. What happens to the plot of total momentum?
options:
  - It falls, because the carts lose speed
  - It stays flat, because momentum is conserved in every collision
  - It rises, because the carts stick together
  - It depends on the masses
answer: 1
explain: Total momentum is the same before and after every collision. Only the kinetic energy changes. It is conserved when bounce is 1, and lost when the carts stick.
```
