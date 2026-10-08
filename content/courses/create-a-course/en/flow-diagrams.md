---
title: Animated flow diagrams
summary: Show how data moves, and where it can break
minutes: 12
objectives:
  - Draw blocks and links, and animate a flow along them
  - Show two-way traffic, groups, zones and proxy layers
  - Mark single points of failure and chokepoints
  - Add a what-if button
---

A **flow diagram** shows how data moves through a system. Traffic is drawn as moving dots, and you can mark the
places where the system is fragile. You write it as text in a fenced block tagged `flow`.

!!! warning "You decide what is a problem"
    The diagram never guesses. It marks single points of failure and chokepoints only where you write them, so the picture always says what you meant to say.

## 1. Blocks and links

The smallest diagram is a chain. Each name becomes a block, and each arrow a link.

````markdown
```flow
browser -> api -> database
```
````

```flow
browser -> api -> database
```

## 2. Name the blocks

Declare a block with `node`, a name in quotes, and a kind. Add text after a link arrow to label the link.

````markdown
```flow
node browser "Browser" client
node api "Order API" service
node db "Orders DB" database
browser -> api "HTTPS" -> db "SQL"
```
````

```flow
node browser "Browser" client
node api "Order API" service
node db "Orders DB" database
browser -> api "HTTPS" -> db "SQL"
```

The kind picks the icon: `client`, `service` (the default), `gateway`, `cache`, `database`, `storage`, `queue`,
`worker`, `external`, and the proxy kinds `ingress`, `egress` and `proxy`.

## 3. Animate a flow

A **flow** is the path one kind of traffic takes, written in the order it travels. It must follow links you have
drawn. Dots move along it. `rate` is how busy it is, and makes busier flows show more dots.

````markdown
```flow
node browser "Browser" client
node api "Order API" service
node db "Orders DB" database
browser -> api -> db
flow order "Place an order" rate=40: browser -> api -> db
```
````

```flow
node browser "Browser" client
node api "Order API" service
node db "Orders DB" database
browser -> api -> db
flow order "Place an order" rate=40: browser -> api -> db
```

Use the buttons above a diagram to pause it, or to show and hide a flow. Visitors who have asked their device to
reduce motion see a still picture with numbered steps instead, and can press **Play animation**.

## 4. Traffic in both directions

Use `<->` for a link that carries traffic both ways. In a flow, a `<->` hop sends a reply back along the link.

````markdown
```flow
node browser "Browser" client
node api "Order API" service
node db "Orders DB" database
browser -> api <-> db
flow order "Place an order": browser -> api <-> db
```
````

```flow
node browser "Browser" client
node api "Order API" service
node db "Orders DB" database
browser -> api <-> db
flow order "Place an order": browser -> api <-> db
```

## 5. Replicas and capacity

Add `replicas=` and `capacity=` (requests per second) to show them under the block's name. They are labels only.
Nothing is calculated from them.

```flow
node api "Order API" service replicas=3 capacity=200
node db "Orders DB" database replicas=1 capacity=65
api <-> db
```

## 6. Groups and zones

A **group** draws a box around the blocks in it. Put a block in a group with `in=`. Group kinds: `vpc`, `subnet`,
`cluster`, `namespace`, `region`, `layer` and `zone`. A group can sit inside another with `in=`.

A **zone** is different: it is not a box. Name a block's zones with `zones=` and it gets a small zone tag. Zones
power the what-if button below.

````markdown
```flow
group vpc "Production VPC" vpc
group k8s "Kubernetes cluster" cluster in=vpc
group za "Zone A" zone
group zb "Zone B" zone

node ingress "Ingress" ingress in=vpc zones=za,zb
node api "API" service replicas=3 in=k8s zones=za,zb
node db "Orders DB" database in=vpc zones=za

ingress -> api <-> db
flow order "Place an order": ingress -> api <-> db
```
````

```flow
group vpc "Production VPC" vpc
group k8s "Kubernetes cluster" cluster in=vpc
group za "Zone A" zone
group zb "Zone B" zone

node ingress "Ingress" ingress in=vpc zones=za,zb
node api "API" service replicas=3 in=k8s zones=za,zb
node db "Orders DB" database in=vpc zones=za

ingress -> api <-> db
flow order "Place an order": ingress -> api <-> db
```

## 7. Proxy layers

Proxies are blocks like any other: `ingress` (traffic coming in), `egress` (traffic going out), and `proxy` for
anything else. Two shortcuts help:

- `via=` on a link sends the link through a proxy, so you do not draw both halves yourself.
- `sidecar=` attaches a small tag to a block, such as a service-mesh proxy that runs beside it.

```flow
node api "API" service replicas=3 sidecar=mesh
node egress "Egress proxy" egress replicas=2
node pay "Payments" external
api <-> pay "HTTPS" via=egress
flow payment "Take a payment" rate=30: api <-> pay
```

## 8. Mark the problem areas

Two statements name the fragile places. Give a reason in quotes, so the reader learns why.

- `spof` marks a **single point of failure**: if it breaks, the flow stops.
- `chokepoint` marks a place where traffic piles up. Mark a block, or a link by writing both ends.
  Add `badge="92%"` to show your own figure.

````markdown
```flow
node customer "Customer" client
node lb "Load balancer" gateway replicas=2
node api "API" service replicas=3
node db "Orders DB" database
customer -> lb -> api <-> db "SQL"
flow order "Place an order" rate=60: customer -> lb -> api <-> db

spof db "One copy of the data"
chokepoint api -> db "Every request waits here" badge="busy"
```
````

```flow
node customer "Customer" client
node lb "Load balancer" gateway replicas=2
node api "API" service replicas=3
node db "Orders DB" database
customer -> lb -> api <-> db "SQL"
flow order "Place an order" rate=60: customer -> lb -> api <-> db

spof db "One copy of the data"
chokepoint api -> db "Every request waits here" badge="busy"
```

Marked blocks get a red dashed ring or an amber outline, and the problems are listed under the diagram. Press
**Show problems** to hide the marks and see the plain picture.

## 9. A what-if button

`whatif` adds a button that shows a group failing. Blocks that live only there fade out, and the flows you list in
`stops=` stop moving. The picture shows what you wrote. It does not work anything out.

```flow
group za "Zone A" zone
group zb "Zone B" zone
node api "API" service replicas=3 zones=za,zb
node db "Orders DB" database zones=za
api <-> db
flow order "Place an order": api <-> db
spof db "Only in Zone A"
whatif "What if Zone A fails?" fail=za stops=order
```

Try the button above.

## Reference

| Line | Meaning |
| --- | --- |
| `title "Text"` | A title for screen readers and the page |
| `direction right` or `down` | Which way the diagram reads. Default `right`. |
| `speed slow`, `normal`, `fast` | How fast dots move |
| `group id "Label" kind [in=group]` | A group box, or a zone |
| `node id "Label" kind [replicas=N] [capacity=N] [in=group] [zones=a,b] [sidecar=text] [sub="text"]` | A block |
| `a -> b -> c`, `a <-> b`, `a <- b` | Links. After a link: a label in quotes, or `via=proxy` |
| `flow id "Label" [rate=N] [color=1-6]: a -> b <-> c` | A flow along existing links |
| `spof id "reason"` | Mark a single point of failure |
| `chokepoint id "reason" [badge="text"]` | Mark a chokepoint on a block |
| `chokepoint a -> b "reason" [badge="text"]` | Mark a chokepoint on a link |
| `whatif "Label" fail=group [stops=flow,flow]` | A what-if button |
| `# comment` | Ignored |

## When something is wrong

Mistakes are reported with the line, and often a suggestion:

````text
line 3: "databse" is not a kind of block. Use one of: "client", "service", ... Did you mean "database"?
line 7: the flow "order" goes from "browser" to "db", but there is no link between them. Add a line like: browser -> db
````

When you upload a zip, mistakes in a diagram block the upload and name the lesson file, the diagram number and the line.

## Tips

- One story per diagram. If it needs more than about twelve blocks, split it.
- Name a flow after what the user is doing ("Place an order"), not the technology.
- Keep reasons short and concrete. "One copy, only in Zone A" teaches more than "bad".
- Use `direction down` for tall, layered systems.

```quiz
type: single
question: How does the diagram know a block is a single point of failure?
options:
  - It counts the replicas
  - You mark it with a spof line
  - It checks the flows automatically
answer: 2
explain: The diagram never guesses. A block is marked only where you write spof (or chokepoint).
```

```quiz
type: truefalse
question: A flow may jump between two blocks that have no link between them.
answer: false
explain: A flow must follow links you have drawn. Otherwise the check reports the missing link.
```
