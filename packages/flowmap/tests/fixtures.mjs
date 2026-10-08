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

/** A small network: a laptop on a home LAN reaches a web server through a router and firewall. */
export const NETWORK = `title "Home to web server"
group lan "Home network" lan cidr=192.168.1.0/24
group dmz "Server network" dmz cidr=10.0.5.0/28
node laptop "Laptop" laptop ip=192.168.1.20 in=lan
node ap "Wi-Fi" wifi in=lan
node router "Home router" router ip=192.168.1.1,203.0.113.7 in=lan
node net "Internet" internet
node fw "Firewall" firewall ip=10.0.5.1 in=dmz
node lb "Load balancer" lb ip=10.0.5.2 ports=80,443 in=dmz
node web "Web servers" server replicas=2 ports=8080 in=dmz
node dns "DNS" dns ip="2001:db8::53"
laptop -> ap -> router -> net -> fw -> lb -> web
laptop -> dns "UDP 53"
flow page "Open a web page" rate=30: laptop -> ap -> router -> net -> fw -> lb -> web
`;
