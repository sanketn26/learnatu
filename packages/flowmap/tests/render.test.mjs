import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, renderSvg, describe } from '../src/index.ts';
import { SAMPLE } from './fixtures.mjs';

// Tests look at the drawing, not at the style sheet inside it.
const svg = (text, options) => renderSvg(parse(text), options).replace(/<style>.*?<\/style>/s, '');

test('draws every block, with its label and kind icon', () => {
  const out = svg(SAMPLE);
  for (const label of ['Customer', 'Ingress proxy', 'API', 'Orders DB', 'Egress proxy', 'Payments']) assert.ok(out.includes(`>${label}</text>`), label);
  assert.equal((out.match(/class="fm-node[ "]/g) ?? []).length, 6);
});

test('only declared problems are marked', () => {
  const out = svg(SAMPLE);
  assert.equal((out.match(/class="fm-badge fm-bad"/g) ?? []).length, 2);
  assert.ok(out.includes('>92%</text>'));
  const plain = svg('a -> b\nnode a "A" replicas=1 capacity=1');
  assert.doesNotMatch(plain, /fm-badge/);
  assert.doesNotMatch(plain, /fm-spof/);
});

test('groups and the sidecar tag are drawn; zones are small tags', () => {
  const out = svg(SAMPLE);
  assert.ok(out.includes('Production VPC') && out.includes('Kubernetes cluster'));
  assert.ok(out.includes('>mesh</text>'));
  assert.ok(out.includes('ZONE A+B'));
});

test('two-way links get arrowheads at both ends', () => {
  const out = svg('a <-> b');
  assert.match(out, /marker-end="url\(#fm-arr\)" marker-start="url\(#fm-arr\)"/);
  assert.doesNotMatch(svg('a -> b'), /marker-start/);
});

test('animated: dots move along flows, and two-way hops send a reply dot', () => {
  const out = svg(SAMPLE);
  assert.ok(out.includes('<animateMotion'));
  assert.equal((out.match(/data-flow="/g) ?? []).length, 2);
  const one = svg('a -> b\nflow f: a -> b');
  const two = svg('a <-> b\nflow f: a <-> b');
  assert.ok((two.match(/<animateMotion/g) ?? []).length > (one.match(/<animateMotion/g) ?? []).length);
});

test('still version: no motion, numbered steps instead', () => {
  const out = svg(SAMPLE, { animate: false });
  assert.doesNotMatch(out, /animateMotion/);
  assert.match(out, /class="fm-step"/);
  assert.ok(out.includes('step 1'));
});

test('text from the author is escaped', () => {
  const out = svg('node a "<img src=x onerror=alert(1)>" service\na -> b');
  assert.doesNotMatch(out, /<img/);
  assert.ok(out.includes('&lt;img'));
  assert.doesNotMatch(svg('title "</title><script>x</script>"\na -> b'), /<script>/);
});

test('ids are unique per diagram so several can share a page', () => {
  const a = svg('a -> b', { idPrefix: 'one' }), b = svg('a -> b', { idPrefix: 'two' });
  assert.ok(a.includes('id="one-shadow"') && b.includes('id="two-shadow"'));
});

test('the description tells the story in words', () => {
  const text = describe(parse(SAMPLE));
  assert.match(text, /Flow "Place order": Customer to Ingress proxy to API to Orders DB, with replies coming back\./);
  assert.match(text, /Single point of failure: Ingress proxy\. One copy\./);
  assert.match(text, /Chokepoint: the link from API to Orders DB/);
  assert.match(text, /What if: What if Zone A fails\? Stops: Place order\./);
});

test('a diagram with only blocks and no flows still renders', () => {
  const out = svg('a -> b');
  assert.match(out, /^<svg /);
  assert.doesNotMatch(out, /fm-flow/);
});

test('each new kind has its own icon', () => {
  const out = svg('node a "A" stream\nnode b "B" document\nnode c "C" disk\nnode d "D" storage\nnode e "E" queue\na -> b -> c -> d -> e');
  const icons = [...out.matchAll(/class="fm-icon" d="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(icons).size, 5);
});

// ------------------------------------------------------------------ networking

import { NETWORK } from './fixtures.mjs';

test('network blocks show their address and ports, and network groups show their range', () => {
  const out = svg(NETWORK);
  assert.ok(out.includes('>192.168.1.1, 203.0.113.7</text>'));
  assert.ok(out.includes('>10.0.5.2 · port 80, 443</text>'));
  assert.ok(out.includes('Home network · 192.168.1.0/24'));
  assert.ok(out.includes('fm-group fm-lan') && out.includes('fm-group fm-dmz'));
  assert.equal((out.match(/class="fm-node[ "]/g) ?? []).length, 8);
});

test('every kind of block has its own icon', () => {
  const kinds = ['server', 'router', 'switch', 'firewall', 'loadbalancer', 'dns', 'vpn', 'accesspoint', 'internet'];
  const paths = kinds.map((k) => svg(`node a "A" ${k}`).match(/class="fm-icon" d="([^"]+)"/)[1]);
  assert.equal(new Set(paths).size, kinds.length);
});
