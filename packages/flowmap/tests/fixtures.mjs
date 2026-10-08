/** The example used throughout the tests and the README. */
export const SAMPLE = `title "Checkout traffic"
group prod "Production VPC" vpc
group k8s "Kubernetes cluster" cluster in=prod
group za "Zone A" zone
group zb "Zone B" zone

node customer "Customer" client
node ingress "Ingress proxy" ingress replicas=1 capacity=120 in=prod zones=za,zb
node api "API" service replicas=3 capacity=200 in=k8s zones=za,zb sidecar=mesh
node db "Orders DB" database capacity=65 in=prod zones=za
node egress "Egress proxy" egress replicas=2 capacity=40 in=prod zones=za,zb
node pay "Payments" external

customer -> ingress -> api
api <-> db "SQL"
api <-> pay "HTTPS" via=egress

flow checkout "Place order" rate=60: customer -> ingress -> api <-> db
flow payment "Take payment" rate=30: api <-> pay

spof ingress "One copy. Every request enters here."
spof db "One copy, and only in Zone A."
chokepoint db "Every write waits for one disk" badge="92%"
chokepoint api -> db "Busy link"
whatif "What if Zone A fails?" fail=za stops=checkout
`;
