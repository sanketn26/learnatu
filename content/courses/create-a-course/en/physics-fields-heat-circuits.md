---
title: Fields, heat and circuits
summary: Electric and gravitational fields, an ideal gas through a cycle, and a battery with resistors and a capacitor
minutes: 18
objectives:
  - Draw the field around charges or masses and read it at a point
  - Take a gas around a cycle on a pressure-volume diagram and see the efficiency
  - Build a circuit with resistors in series and parallel, and charge a capacitor
---

These three scenes work out their numbers from the laws of physics, so what you draw is also what the formulas give: Coulomb's and Newton's laws, the ideal gas law and the first law of thermodynamics, and Ohm's law.

## 1. Fields

A `charge` or a `mass` is a source. The scene draws arrows, field lines and, if you ask, shading for the potential. A `probe` reads the field at a point. Electric and gravity scenes are not mixed.

````markdown
```phys
scene field
title "Two opposite charges"
param q 1..8 nC start=3 label="Size of the charges"
charge plus at=(-1m,0m) q=$q
charge minus at=(1m,0m) q=-3nC
probe p at=(0m,1.2m)
show lines arrows
assume "point charges in empty space"
```
````

```phys
scene field
title "Two opposite charges"
param q 1..8 nC start=3 label="Size of the charges"
charge plus at=(-1m,0m) q=$q
charge minus at=(1m,0m) q=-3nC
probe p at=(0m,1.2m)
show lines arrows
assume "point charges in empty space"
```

- `show lines arrows potential` chooses what to draw. The default is lines and arrows.
- A probe prints the strength, with its unit, and the direction.

```phys
scene field
title "Two planets"
param m2 1..10 e24kg start=3 label="Mass of the second planet"
mass earth at=(-8e6m,0m) m=5.97e24kg
mass other at=(8e6m,0m) m=$m2
probe ship at=(0m,6e6m)
show lines potential
```


## 2. A gas going around a cycle

Start with `gas`, giving any two of pressure, volume and temperature (the third follows from pV = nRT). Then list `process` steps. Each one is isothermal, isobaric, isochoric or adiabatic, and says where it ends. The table shows the heat, the work and the change in internal energy for each step, always satisfying the first law.

````markdown
```phys
scene cycle
title "A Carnot engine"
gas moles=1 p=400kPa T=500K gamma=1.4
process isothermal v=0.02m3
process adiabatic T=300K
process isothermal v=0.0373m3
process adiabatic T=500K
note 1 "Heat flows in from the hot reservoir while the gas expands."
note 3 "Heat flows out to the cold reservoir while the gas is compressed."
```
````

```phys
scene cycle
title "A Carnot engine"
gas moles=1 p=400kPa T=500K gamma=1.4
process isothermal v=0.02m3
process adiabatic T=300K
process isothermal v=0.0373m3
process adiabatic T=500K
note 1 "Heat flows in from the hot reservoir while the gas expands."
note 3 "Heat flows out to the cold reservoir while the gas is compressed."
```

- When the last step returns to the start, the loop is shaded and the work per cycle and the **efficiency** are shown.
- `note 1 "…"` attaches a sentence to process number 1.

```phys
scene cycle
title "The Otto cycle"
param tmax 1200..2400 K start=1800 label="Peak temperature after the spark"
gas moles=0.05 p=100kPa T=300K gamma=1.4
process adiabatic v=0.000156m3
process isochoric T=$tmax
process adiabatic v=0.001247m3
process isochoric T=300K
predict "Raise the peak temperature. Does the efficiency change?" answer="No. For an Otto cycle the efficiency is 1 minus 1 over (compression ratio to the power gamma minus 1), about 56% for a ratio of 8, whatever the peak temperature."
```


## 3. Circuits

A `battery` and the parts around the loop, in order. Resistors are in series unless you put them between `parallel` and `end`. The picture shows the current as moving dots, and the voltage across each part. The voltage drops always add up to the battery's voltage.

````markdown
```phys
scene circuit
title "A battery, one resistor, and two in parallel"
param volts 1..24 V start=9 label="Battery"
battery $volts
resistor R1 100ohm
parallel
  resistor R2 200ohm
  resistor R3 300ohm
end
```
````

```phys
scene circuit
title "A battery, one resistor, and two in parallel"
param volts 1..24 V start=9 label="Battery"
battery $volts
resistor R1 100ohm
parallel
  resistor R2 200ohm
  resistor R3 300ohm
end
```


Add a `capacitor` and the scene becomes a charging curve over time, with the time constant RC.

````markdown
```phys
scene circuit
title "Charging a capacitor through a resistor"
param r 100..5000 ohm start=1000 label="Resistance"
battery 9V
resistor R1 $r
capacitor C1 100uF
predict "Double the resistance. What happens to the time it takes to charge?" answer="It doubles. The time constant is R times C."
```
````

```phys
scene circuit
title "Charging a capacitor through a resistor"
param r 100..5000 ohm start=1000 label="Resistance"
battery 9V
resistor R1 $r
capacitor C1 100uF
predict "Double the resistance. What happens to the time it takes to charge?" answer="It doubles. The time constant is R times C."
```


## What these scenes cannot do

- Fields: moving charges, magnetic fields, fields inside matter.
- Cycles: real gases, phase changes, anything that is not slow and reversible.
- Circuits: one loop only. No inductors, no alternating current, no real batteries.

## What to remember

- The numbers are computed from the laws, so a mistake in units is caught before it can make a wrong picture.
- A cycle needs two of p, v and T for the start, and one target for every process.
- A capacitor goes in series, and it turns the scene into something that changes with time.

```quiz
type: single
question: In the Otto cycle example, the readers raise the peak temperature. What happens to the efficiency shown?
options:
  - It rises, because the gas is hotter
  - It falls, because more heat is wasted
  - It stays the same, because it depends only on the compression ratio
  - It becomes 100%
answer: 2
explain: For an ideal Otto cycle the efficiency is 1 minus 1 over (compression ratio to the power gamma minus 1). The peak temperature does not appear in it.
```
