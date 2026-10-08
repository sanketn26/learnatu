---
title: Waves, light and sound
summary: Moving sources, interference, slits, lenses, mirrors and refraction
minutes: 18
objectives:
  - Show a wave spreading from a source, and the Doppler effect for sound
  - Show interference from two sources and the fringes from two slits
  - Trace the rays through a lens or a mirror, and a beam crossing a boundary
---

Light and sound are both waves, but they behave differently in some ways, and the language knows the difference. Every wave scene says what the wave travels in with `medium`: sound needs a material (`air`, `water`, `steel`) and light travels in `vacuum` or `glass`.

## 1. A wave from a moving source

A `source` has a position and a frequency `f`. Add a speed with `v=(…,…)` and the waves bunch up in front and spread out behind: the Doppler effect. Past the speed of sound they pile up into a shock cone.

````markdown
```phys
scene wave
title "A moving source of sound"
medium air
param speed 0..500 m/s start=170 label="Speed of the source"
source siren at=(-8m,0m) f=100Hz v=($speed,0m/s)
assume "still air, a point source, no echoes"
run 12periods
note 0periods "Drag the speed slider. Past 343 m/s the source outruns its own sound."
```
````

```phys
scene wave
title "A moving source of sound"
medium air
param speed 0..500 m/s start=170 label="Speed of the source"
source siren at=(-8m,0m) f=100Hz v=($speed,0m/s)
assume "still air, a point source, no echoes"
run 12periods
note 0periods "Drag the speed slider. Past 343 m/s the source outruns its own sound."
```

- The time axis counts **periods** of the first source (`run 12periods`), so a scene of light waves works as well as one of sound.
- Moving sources are for sound only. For light, a moving source needs relativity, and the checker says so and points to the spacetime scene.

## 2. Two sources: interference

When two sources share a frequency, the shading shows where the waves reinforce each other and where they cancel. A `probe` records the wave at one point, and `plot ear` draws what it hears over time.

```phys
scene wave
title "Two speakers, one note"
medium air
param gap 1..8 m start=4 label="Distance between the speakers"
source left at=(-2m,-1m) f=170Hz
source right at=(2m,1m) f=170Hz
probe ear at=(6m,0m)
run 6periods
plot ear
```


## 3. Light through two slits

`slits` draws the pattern of fringes light makes on a screen. Give the distance between the slits, the wavelength, and where the screen is. The colour comes from the wavelength, and the fringe spacing is wavelength × distance ÷ slit spacing.

````markdown
```phys
scene wave
title "Light through two slits"
param wavelength 400..700 nm start=550 label="Wavelength of the light"
param d 0.05..0.5 mm start=0.2 label="Distance between the slits"
slits d=$d width=0.02mm wavelength=$wavelength
screen at=1.5m
assume "narrow slits, light of a single wavelength, far field"
```
````

```phys
scene wave
title "Light through two slits"
param wavelength 400..700 nm start=550 label="Wavelength of the light"
param d 0.05..0.5 mm start=0.2 label="Distance between the slits"
slits d=$d width=0.02mm wavelength=$wavelength
screen at=1.5m
assume "narrow slits, light of a single wavelength, far field"
```


## 4. Lenses and mirrors

A `ray` scene puts an `object` in front of one thin `lens` or one `mirror`. The three principal rays are traced and the image is described: real or virtual, upright or inverted, bigger or smaller. A negative `f` gives a diverging lens or a convex mirror.

````markdown
```phys
scene ray
title "A converging lens"
param u -40..-4 cm start=-20 label="Object position (the lens is at 0)"
object at=$u height=3cm
lens at=0cm f=8cm
screen at=13.3cm
```
````

```phys
scene ray
title "A converging lens"
param u -40..-4 cm start=-20 label="Object position (the lens is at 0)"
object at=$u height=3cm
lens at=0cm f=8cm
screen at=13.3cm
```


```phys
scene ray
title "A concave mirror"
param u -30..-3 cm start=-14 label="Object position (the mirror is at 0)"
object at=$u height=2cm
mirror at=0cm f=6cm
assume "a thin lens or small mirror, rays close to the axis"
```


Move the object inside the focal length and the rays no longer meet: the image becomes virtual, and the lines are drawn dashed behind the lens.

## 5. Refraction

A `beam` crosses a boundary between two materials. The graph shows the whole relationship, with the current beam marked on it. When light goes from glass towards air, the beam is totally reflected past the critical angle.

````markdown
```phys
scene ray
title "Light leaving glass"
param angle 0..85 deg start=30 label="Angle of incidence"
param n2 1..2 start=1 label="Index of the second material"
beam angle=$angle n1=1.5 n2=$n2
predict "At what angle does the light stop leaving the glass?" answer="Past the critical angle, asin(n2 / n1). For glass to air that is about 41.8 degrees."
```
````

```phys
scene ray
title "Light leaving glass"
param angle 0..85 deg start=30 label="Angle of incidence"
param n2 1..2 start=1 label="Index of the second material"
beam angle=$angle n1=1.5 n2=$n2
predict "At what angle does the light stop leaving the glass?" answer="Past the critical angle, asin(n2 / n1). For glass to air that is about 41.8 degrees."
```


## What a wave or ray scene cannot do

- No polarisation yet. For sound it can never be done (sound in air is longitudinal), and the checker says why.
- No reflections off walls, no thick lenses, no colour spreading.
- The slit pattern is a diagram, not to scale: the numbers are right, and the labels say the geometry is not.

## What to remember

- Say what the wave travels in with `medium`. Light and sound are not interchangeable.
- `run 12periods` and `note 2periods "…"` use periods of the first source as time.
- A `ray` scene is either an object with a lens or mirror, or a beam. Not both.

```quiz
type: single
question: You write a wave scene in a vacuum with a moving source. What does the checker do, and why?
options:
  - Nothing. It draws the Doppler effect
  - It refuses, because a moving source of light needs relativity
  - It refuses, because a vacuum has no waves
  - It slows the source down to the speed of sound
answer: 1
explain: The ordinary Doppler picture is for waves that need a medium, such as sound. Light does not, so a moving source of light needs special relativity, which is the spacetime scene.
```
