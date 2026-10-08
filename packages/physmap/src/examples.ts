/**
 * Complete working scenes, one or more per kind. The playground offers them as starting points, the tests check that
 * every one is valid, and teachers copy and change them. Keep each short and well commented in its caption.
 */
export interface Example { id: string; kind: string; title: string; text: string }

export const EXAMPLES: Example[] = [
  {
    id: 'throw', kind: 'mechanics', title: 'A ball thrown at an angle',
    text: `scene mechanics
title "A throw"
gravity earth
param angle 10..80 deg start=45 label="Launch angle"
body ball mass=0.2kg at=(0m,0m) speed=20m/s angle=$angle
ground y=0m bounce=0
run 4s
show velocity
trail ball
plot ball.y
`
  },
  {
    id: 'spring', kind: 'mechanics', title: 'Mass on a spring',
    text: `scene mechanics
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
predict "What happens to the time of one swing if the mass doubles?" answer="It gets about 41% longer."
`
  },
  {
    id: 'pendulum', kind: 'mechanics', title: 'A pendulum on the Moon and Jupiter',
    text: `scene mechanics
title "A pendulum"
assume "a very stiff rod with no mass, no air resistance"
param g 1.6..24 m/s2 start=9.8 label="Gravity"
gravity $g
body bob mass=1kg at=(0.9m,1.6m)
rod from=(0m,2.5m) to=bob
run 8s
trail bob
plot bob.x
`
  },
  {
    id: 'bounce', kind: 'mechanics', title: 'A bouncing ball',
    text: `scene mechanics
title "A bouncing ball"
gravity earth
param e 0.3..0.95 start=0.8 label="Bounciness"
body ball mass=1kg at=(0m,2m) radius=0.1m
ground y=0m bounce=$e
run 6s
plot ball.y
`
  },
  {
    id: 'incline', kind: 'mechanics', title: 'A block on a ramp: free-body diagram',
    text: `scene mechanics
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
`
  },
  {
    id: 'collision', kind: 'mechanics', title: 'Two carts colliding',
    text: `scene mechanics
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
`
  },
  {
    id: 'sliding', kind: 'mechanics', title: 'Sliding to a stop',
    text: `scene mechanics
title "Friction brings a sliding box to rest"
gravity earth
param mu 0.05..0.8 start=0.25 label="Friction"
ground y=0m friction=$mu
body box mass=5kg at=(0m,0m) v=(6m/s,0m/s)
run 8s
show velocity friction
plot box.vx
`
  },
  {
    id: 'doppler', kind: 'wave', title: 'The Doppler effect',
    text: `scene wave
title "A moving source of sound"
medium air
param speed 0..500 m/s start=170 label="Speed of the source"
source siren at=(-8m,0m) f=100Hz v=($speed,0m/s)
assume "still air, a point source, no echoes"
run 12periods
note 0periods "Drag the speed slider. Past 343 m/s the source outruns its own sound."
`
  },
  {
    id: 'interference', kind: 'wave', title: 'Two sources interfering',
    text: `scene wave
title "Two speakers, one note"
medium air
param gap 1..8 m start=4 label="Distance between the speakers"
source left at=(-2m,-1m) f=170Hz
source right at=(2m,1m) f=170Hz
probe ear at=(6m,0m)
run 6periods
plot ear
`
  },
  {
    id: 'double-slit', kind: 'wave', title: "Young's double slit",
    text: `scene wave
title "Light through two slits"
param wavelength 400..700 nm start=550 label="Wavelength of the light"
param d 0.05..0.5 mm start=0.2 label="Distance between the slits"
slits d=$d width=0.02mm wavelength=$wavelength
screen at=1.5m
assume "narrow slits, light of a single wavelength, far field"
`
  },
  {
    id: 'lens', kind: 'ray', title: 'Image from a converging lens',
    text: `scene ray
title "A converging lens"
param u -40..-4 cm start=-20 label="Object position (the lens is at 0)"
object at=$u height=3cm
lens at=0cm f=8cm
screen at=13.3cm
`
  },
  {
    id: 'mirror', kind: 'ray', title: 'A concave mirror',
    text: `scene ray
title "A concave mirror"
param u -30..-3 cm start=-14 label="Object position (the mirror is at 0)"
object at=$u height=2cm
mirror at=0cm f=6cm
assume "a thin lens or small mirror, rays close to the axis"
`
  },
  {
    id: 'refraction', kind: 'ray', title: 'Refraction and total internal reflection',
    text: `scene ray
title "Light leaving glass"
param angle 0..85 deg start=30 label="Angle of incidence"
param n2 1..2 start=1 label="Index of the second material"
beam angle=$angle n1=1.5 n2=$n2
predict "At what angle does the light stop leaving the glass?" answer="Past the critical angle, asin(n2 / n1). For glass to air that is about 41.8 degrees."
`
  },
  {
    id: 'dipole', kind: 'field', title: 'An electric dipole',
    text: `scene field
title "Two opposite charges"
param q 1..8 nC start=3 label="Size of the charges"
charge plus at=(-1m,0m) q=$q
charge minus at=(1m,0m) q=-3nC
probe p at=(0m,1.2m)
show lines arrows
assume "point charges in empty space"
`
  },
  {
    id: 'gravity-wells', kind: 'field', title: 'Gravity around two planets',
    text: `scene field
title "Two planets"
param m2 1..10 e24kg start=3 label="Mass of the second planet"
mass earth at=(-8e6m,0m) m=5.97e24kg
mass other at=(8e6m,0m) m=$m2
probe ship at=(0m,6e6m)
show lines potential
`
  },
  {
    id: 'carnot', kind: 'cycle', title: 'A Carnot cycle',
    text: `scene cycle
title "A Carnot engine"
gas moles=1 p=400kPa T=500K gamma=1.4
process isothermal v=0.02m3
process adiabatic T=300K
process isothermal v=0.0373m3
process adiabatic T=500K
note 1 "Heat flows in from the hot reservoir while the gas expands."
note 3 "Heat flows out to the cold reservoir while the gas is compressed."
`
  },
  {
    id: 'otto', kind: 'cycle', title: 'A petrol engine (Otto cycle)',
    text: `scene cycle
title "The Otto cycle"
param tmax 1200..2400 K start=1800 label="Peak temperature after the spark"
gas moles=0.05 p=100kPa T=300K gamma=1.4
process adiabatic v=0.000156m3
process isochoric T=$tmax
process adiabatic v=0.001247m3
process isochoric T=300K
predict "Raise the peak temperature. Does the efficiency change?" answer="No. For an Otto cycle the efficiency is 1 minus 1 over (compression ratio to the power gamma minus 1), about 56% for a ratio of 8, whatever the peak temperature."
`
  },
  {
    id: 'series-parallel', kind: 'circuit', title: 'Resistors in series and in parallel',
    text: `scene circuit
title "A battery, one resistor, and two in parallel"
param volts 1..24 V start=9 label="Battery"
battery $volts
resistor R1 100ohm
parallel
  resistor R2 200ohm
  resistor R3 300ohm
end
`
  },
  {
    id: 'rc', kind: 'circuit', title: 'Charging a capacitor',
    text: `scene circuit
title "Charging a capacitor through a resistor"
param r 100..5000 ohm start=1000 label="Resistance"
battery 9V
resistor R1 $r
capacitor C1 100uF
predict "Double the resistance. What happens to the time it takes to charge?" answer="It doubles. The time constant is R times C."
`
  },
  {
    id: 'relativity-of-simultaneity', kind: 'spacetime', title: 'Simultaneity depends on the observer',
    text: `scene spacetime
title "Two events at the same time in S"
param v 0..0.95 c start=0.6 label="Speed of the moving observer"
event A at=(0yr,0ly)
event B at=(0yr,3ly)
frame S2 v=$v
show simultaneity A
measure A B
predict "Which event happens first for the moving observer?" answer="It depends on the direction of motion. The observer moving toward B sees B happen first. Neither is wrong: simultaneity is not absolute."
`
  },
  {
    id: 'time-dilation', kind: 'spacetime', title: 'A moving clock runs slow',
    text: `scene spacetime
title "The twin who travels"
param v 0..0.95 c start=0.8 label="Speed of the travelling twin"
event Start at=(0yr,0ly)
event Meet at=(10yr,0ly)
worldline Stay from=Start to=Meet
clock Traveller from=Start v=$v ticks=1yr
show lightcone Start
frame Twin v=$v
`
  },
  {
    id: 'hadamard', kind: 'bloch', title: 'Superposition with a Hadamard gate',
    text: `scene bloch
title "One qubit"
state |0>
step "The qubit starts in |0>, at the north pole. Measuring it gives 0 every time."
step "A Hadamard gate turns it a half-turn about the axis halfway between x and z."
  gate H
step "Now it lies on the equator, in an equal superposition. Measuring it along z gives 0 or 1, each half the time."
  measure z
step "Applying the Hadamard gate again undoes it."
  gate H
`
  },
  {
    id: 'phase', kind: 'bloch', title: 'Phase: rotating around the equator',
    text: `scene bloch
title "Phase gates"
param turn 0..360 deg start=90 label="Rotation about z"
state |+>
step "Start on the equator, in |+>. All the gates here turn the state around the z axis."
step "Rz turns it by the angle you choose. The odds of 0 and 1 do not change, but the phase does."
  gate Rz angle=$turn
step "A Hadamard gate turns that phase into a difference in odds you can measure."
  gate H
  measure z
`
  }
];
