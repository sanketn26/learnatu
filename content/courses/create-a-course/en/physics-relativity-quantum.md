---
title: Relativity and a single qubit
summary: Spacetime diagrams with a moving observer, and gates on the Bloch sphere
minutes: 16
objectives:
  - Draw events and light on a spacetime diagram, and boost the observer
  - Show that simultaneity depends on the observer but the interval does not
  - Show one qubit and its gates as rotations of the Bloch sphere
---

These two scenes draw ideas that are hard to picture in words. They are exact within their limits (flat spacetime, one qubit), and the limits are written into the language, so nothing can be drawn that would be wrong.

## 1. Spacetime diagrams

A spacetime scene shows **events** on a diagram with distance across and time up, in units where light travels at 45°. Declare a moving observer with `frame`, and the time slider boosts you from the rest frame to that observer. The same events get new coordinates.

````markdown
```phys
scene spacetime
title "Two events at the same time in S"
param v 0..0.95 c start=0.6 label="Speed of the moving observer"
event A at=(0yr,0ly)
event B at=(0yr,3ly)
frame S2 v=$v
show simultaneity A
measure A B
predict "Which event happens first for the moving observer?" answer="It depends on the direction of motion. The observer moving toward B sees B happen first. Neither is wrong: simultaneity is not absolute."
```
````

```phys
scene spacetime
title "Two events at the same time in S"
param v 0..0.95 c start=0.6 label="Speed of the moving observer"
event A at=(0yr,0ly)
event B at=(0yr,3ly)
frame S2 v=$v
show simultaneity A
measure A B
predict "Which event happens first for the moving observer?" answer="It depends on the direction of motion. The observer moving toward B sees B happen first. Neither is wrong: simultaneity is not absolute."
```

- `show simultaneity A` draws the line of events happening at the same time as A: level for the observer you are, tilted for the rest frame.
- `measure A B` prints the time and distance between two events, and the interval, which does not change as you boost.
- Write `param v 0..0.95 c` for a speed slider: speeds are checked, and nothing may reach 1c.

## 2. A moving clock

A `clock` ticks at equal steps of its own time. Seen from another frame, the ticks are further apart: time dilation. `worldline` joins two events, and the checker refuses one that would need to go faster than light.

````markdown
```phys
scene spacetime
title "The twin who travels"
param v 0..0.95 c start=0.8 label="Speed of the travelling twin"
event Start at=(0yr,0ly)
event Meet at=(10yr,0ly)
worldline Stay from=Start to=Meet
clock Traveller from=Start v=$v ticks=1yr
show lightcone Start
frame Twin v=$v
```
````

```phys
scene spacetime
title "The twin who travels"
param v 0..0.95 c start=0.8 label="Speed of the travelling twin"
event Start at=(0yr,0ly)
event Meet at=(10yr,0ly)
worldline Stay from=Start to=Meet
clock Traveller from=Start v=$v ticks=1yr
show lightcone Start
frame Twin v=$v
```


## 3. One qubit on the Bloch sphere

`state` is where the qubit starts. Each `gate` is a turn of the sphere about an axis: the animation shows exactly that turn, and the bars give the odds of each measurement result. `step` lines narrate, and `measure` picks the axis whose odds are shown.

````markdown
```phys
scene bloch
title "One qubit"
state |0>
step "The qubit starts in |0>, at the north pole. Measuring it gives 0 every time."
step "A Hadamard gate turns it a half-turn about the axis halfway between x and z."
  gate H
step "Now it lies on the equator, in an equal superposition. Measuring it along z gives 0 or 1, each half the time."
  measure z
step "Applying the Hadamard gate again undoes it."
  gate H
```
````

```phys
scene bloch
title "One qubit"
state |0>
step "The qubit starts in |0>, at the north pole. Measuring it gives 0 every time."
step "A Hadamard gate turns it a half-turn about the axis halfway between x and z."
  gate H
step "Now it lies on the equator, in an equal superposition. Measuring it along z gives 0 or 1, each half the time."
  measure z
step "Applying the Hadamard gate again undoes it."
  gate H
```


```phys
scene bloch
title "Phase gates"
param turn 0..360 deg start=90 label="Rotation about z"
state |+>
step "Start on the equator, in |+>. All the gates here turn the state around the z axis."
step "Rz turns it by the angle you choose. The odds of 0 and 1 do not change, but the phase does."
  gate Rz angle=$turn
step "A Hadamard gate turns that phase into a difference in odds you can measure."
  gate H
  measure z
```


## What these scenes cannot do

- Relativity: gravity, acceleration, curved spacetime, more than one dimension of space.
- Qubits: only one. A picture of several entangled qubits would not be honest, so the language does not offer one.

## What to remember

- In a spacetime scene, events are `(time, place)`. Simultaneity and distances depend on the observer, the interval does not.
- Every gate on the Bloch sphere is a rotation: `Rx`, `Ry`, `Rz` take an angle, the others do not.
- Speeds in relativity and the number of qubits are checked, so the picture stays within what is true.

```quiz
type: single
question: Two events happen at the same time in the rest frame S, in different places. Seen from a moving observer, what is true?
options:
  - They still happen at the same time
  - They happen at different times, and which comes first depends on the direction of motion
  - They happen in the same place
  - The interval between them changes
answer: 1
explain: Simultaneity is not absolute. The coordinates of the events change with the observer, but the interval between them stays the same.
```
