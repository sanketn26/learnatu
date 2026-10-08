---
title: Network diagrams
summary: Draw routers, firewalls, subnets and the path a request takes
minutes: 10
objectives:
  - Use network blocks such as router, switch, firewall and load balancer
  - Show addresses, ports and address ranges
  - Draw LAN, DMZ and VLAN boxes
  - Trace a request across a network
---

Network lessons use the same `flow` diagrams as the lesson before, with extra block kinds and a way to show
**addresses**. If you have not read the flow diagrams lesson, read it first.

## 1. Network blocks

These kinds draw their own icon:

| Kind | For | Also accepted |
| --- | --- | --- |
| `client` | A laptop, phone or PC | `laptop`, `phone`, `mobile`, `pc`, `device` |
| `accesspoint` | Wi-Fi | `wifi`, `ap`, `wap` |
| `switch` | A network switch | |
| `router` | A router or modem | `gw`, `modem`, `nat` |
| `firewall` | A firewall | `fw`, `waf` |
| `loadbalancer` | Spreads traffic over servers | `lb`, `alb`, `nlb` |
| `server` | A server or virtual machine | `host`, `vm`, `webserver` |
| `dns` | A DNS server | `nameserver`, `resolver` |
| `vpn` | A VPN gateway | |
| `internet` | The internet | `wan`, `web` |

```flow
node laptop "Laptop" laptop
node wifi "Wi-Fi" wifi
node router "Router" router
node net "Internet" internet
laptop -> wifi -> router -> net
```

## 2. Addresses and ports

Add `ip=` to show an address under the name. A router has one address per interface, so separate them with commas.
Add `ports=` for the ports a block listens on, or a range like `8000-8100`. The diagram checks that addresses and
ports are possible, so `10.0.0.256` is reported as a mistake.

!!! tip "IPv6 needs quotes"
    IPv6 addresses contain colons, so write them in quotes: `ip="2001:db8::53"`.

```flow
node router "Home router" router ip=192.168.1.1,203.0.113.7
node dns "DNS" dns ip="2001:db8::53" ports=53
node web "Web server" server ip=10.0.5.10 ports=80,443
router -> dns "UDP 53"
router -> web "HTTPS"
```

## 3. Networks as boxes

A group draws a box. The kinds `lan`, `dmz`, `vlan` and `subnet` suit networks, and `cidr=` writes the address range
beside the name. A range needs its prefix, like `/24`.

```flow
group lan "Home network" lan cidr=192.168.1.0/24
group dmz "Server network" dmz cidr=10.0.5.0/28

node laptop "Laptop" laptop ip=192.168.1.20 in=lan
node router "Home router" router ip=192.168.1.1 in=lan
node net "Internet" internet
node fw "Firewall" firewall ip=10.0.5.1 in=dmz
node lb "Load balancer" lb ip=10.0.5.2 ports=80,443 in=dmz
node web "Web servers" server replicas=2 ports=8080 in=dmz

laptop -> router -> net -> fw -> lb -> web
flow page "Open a web page" rate=30: laptop -> router -> net -> fw -> lb -> web
```

## 4. Show where it can break

`spof` and `chokepoint` work on network blocks too. Mark the places you want learners to notice, and say why.

```flow
node office "Office" client
node router "Only router" router
node net "Internet" internet
office -> router -> net
flow web "Browse the web": office -> router -> net
spof router "If this fails, the whole office is offline"
```

## Tips

- Draw one path at a time: first the request, then (in a second diagram) the failure.
- Use the link label for the protocol and port ("HTTPS", "UDP 53"). Use `ip=` for the device.
- For the order of a conversation (handshakes, DNS lookups) a sequence diagram is clearer. See the sequence diagrams lesson.
- Keep example addresses in the ranges meant for teaching: `192.168.x.x`, `10.x.x.x` and `203.0.113.x`.

```quiz
type: single
question: Which line shows the address range of a network box?
options:
  - group lan "Home" lan range=192.168.1.0
  - group lan "Home" lan cidr=192.168.1.0/24
  - node lan "Home" lan ip=192.168.1.0
answer: 2
explain: Groups take cidr= with a prefix. ip= belongs to a block, not a group.
```

```quiz
type: truefalse
question: IPv6 addresses must be written in quotes, as in ip="2001:db8::1".
answer: true
explain: The colons would otherwise be read as part of the diagram language.
```
