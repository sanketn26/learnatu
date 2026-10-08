export const SPRING = `scene mechanics
title "Mass on a spring"
assume "no friction, ideal spring"
param k 10..100 N/m start=40 label="Stiffness"
param mass 0.5..5 kg start=2
body b mass=$mass at=(0.6m, 0m)
spring k=$k from=(0m,0m) to=b rest=0.4m
run 6s
plot b.x
plot ke pe energy
note 0s "Pulled out to the right and let go."
note 1s "It speeds up toward the middle."
predict "What happens to the period if the mass doubles?" answer="It grows by about 41%."
`;

export const THROW = `scene mechanics
title "A throw"
gravity earth
body ball mass=0.2kg at=(0m,0m) speed=20m/s angle=45deg
ground y=0m bounce=0
run 4s
show velocity
trail ball
`;

export const BOUNCE = `scene mechanics
gravity earth
body ball mass=1kg at=(0m,2m) radius=0.1m
ground y=0m bounce=0.8
run 6s
plot ball.y
`;

export const PENDULUM = `scene mechanics
gravity earth
body bob mass=1kg at=(0.5m,1.8m)
rod from=(0m,2.5m) to=bob
run 5s
plot bob.x
`;
