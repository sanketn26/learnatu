import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, parseFlow, check, FlowSyntaxError } from '../src/index.ts';
import { SAMPLE } from './fixtures.mjs';

const messages = (text) => check(text).map((p) => `${p.line}: ${p.message}`).join('\n');

test('the sample parses with no problems', () => {
  assert.deepEqual(check(SAMPLE), []);
});

test('blocks, groups and links are read as written', () => {
  const d = parse(SAMPLE);
  assert.equal(d.title, 'Checkout traffic');
  assert.equal(d.groups.length, 4);
  const api = d.nodes.find((n) => n.id === 'api');
  assert.deepEqual({ kind: api.kind, replicas: api.replicas, capacity: api.capacity, group: api.group, zones: api.zones, sidecar: api.sidecar },
    { kind: 'service', replicas: 3, capacity: 200, group: 'k8s', zones: ['za', 'zb'], sidecar: 'mesh' });
  assert.equal(d.nodes.find((n) => n.id === 'customer').label, 'Customer');
});

test('a chain makes one link per arrow, and <-> makes it two-way', () => {
  const d = parse('a -> b -> c\nc <-> d');
  assert.deepEqual(d.edges.map((e) => [e.id, e.twoWay]), [['a>b', false], ['b>c', false], ['c>d', true]]);
});

test('<- reverses the link', () => {
  const d = parse('a <- b');
  assert.deepEqual(d.edges.map((e) => e.id), ['b>a']);
});

test('via= puts a proxy on the way and flows pass through it', () => {
  const d = parse(SAMPLE);
  assert.deepEqual(d.edges.map((e) => e.id).sort(), ['api>db', 'api>egress', 'customer>ingress', 'egress>pay', 'ingress>api']);
  const payment = d.flows.find((f) => f.id === 'payment');
  assert.deepEqual(payment.hops.map((h) => `${h.from}>${h.to}`), ['api>egress', 'egress>pay']);
});

test('flows keep their order and two-way hops', () => {
  const checkout = parse(SAMPLE).flows.find((f) => f.id === 'checkout');
  assert.deepEqual(checkout.hops.map((h) => [h.from, h.to, h.twoWay]), [['customer', 'ingress', false], ['ingress', 'api', false], ['api', 'db', true]]);
  assert.equal(checkout.rate, 60);
});

test('problem areas are exactly what was written, nothing more', () => {
  const d = parse(SAMPLE);
  assert.deepEqual(d.marks.map((m) => [m.kind, m.node ?? m.edge]), [['spof', 'ingress'], ['spof', 'db'], ['chokepoint', 'db'], ['chokepoint', 'api>db']]);
  assert.equal(d.marks[2].badge, '92%');
  const none = parse('a -> b\nnode b "B" database replicas=1 capacity=1');
  assert.deepEqual(none.marks, []); // one copy and a tiny capacity are NOT flagged by themselves
});

test('what-if scenarios', () => {
  assert.deepEqual(parse(SAMPLE).whatifs, [{ label: 'What if Zone A fails?', fail: 'za', stops: ['checkout'], line: SAMPLE.split('\n').findIndex((l) => l.startsWith('whatif')) + 1 }]);
});

test('every mistake is reported with its line', () => {
  const text = 'a -> b\nfoo bar\nnode c "C" databse\nspof zz\nflow x: a -> c';
  const lines = check(text).map((p) => p.line);
  assert.deepEqual(lines, [2, 3, 4, 5]);
});

test('messages help: did you mean ...', () => {
  assert.match(messages('node a "A" databse'), /Did you mean "database"\?/);
  assert.match(messages('node db "DB"\nspof dbb'), /Did you mean "db"\?/);
  assert.match(messages('flw x: a -> b'), /Did you mean "flow"\?/);
});

test('flows must follow links that exist', () => {
  assert.match(messages('a -> b\nnode c "C"\nflow x: a -> c'), /no link between them. Add a line like: a -> c/);
  assert.match(messages('a -> b\nflow x: a <-> b'), /one-way/);
});

test('a flow cannot run backwards', () => {
  assert.match(messages('a -> b\nflow x: b <- a'), /always travels forward/);
});

test('groups and zones are checked', () => {
  assert.match(messages('node a "A" in=nope'), /not a group/);
  assert.match(messages('group z "Z" zone\nnode a "A" in=z'), /is a zone/);
  assert.match(messages('group c "C" cluster\nnode a "A" zones=c'), /is a cluster, not a zone/);
  assert.match(messages('group g "G" blob'), /needs a kind/);
  assert.match(messages('group a "A" vpc in=b\ngroup b "B" vpc in=a'), /contains itself/);
});

test('settings are validated', () => {
  assert.match(messages('direction sideways'), /"right" or "down"/);
  assert.match(messages('node a "A" replicas=0'), /whole number/);
  assert.match(messages('node a "A" colour=red'), /is not a setting/);
  assert.match(messages('a -> b\nflow f color=9: a -> b'), /1 to 6/);
});

test('an empty diagram is a problem', () => {
  assert.match(messages('# nothing here'), /empty/);
});

test('parse throws one error listing all problems', () => {
  try { parse('foo\nbar baz'); assert.fail('should throw'); } catch (e) {
    assert.ok(e instanceof FlowSyntaxError);
    assert.equal(e.problems.length, 2);
    assert.match(e.message, /line 1/);
  }
});

test('parseFlow returns no diagram when there are problems', () => {
  assert.equal(parseFlow('foo').diagram, null);
});

test('streams, queues, document stores, file storage and disks are all kinds of block', () => {
  const d = parse('node a "Events" stream\nnode b "Jobs" queue\nnode c "Docs" document\nnode d "Files" storage\nnode e "Disk" disk');
  assert.deepEqual(d.nodes.map((n) => n.kind), ['stream', 'queue', 'document', 'storage', 'disk']);
});

test('familiar names work as kinds: kafka, mongodb, s3, volume', () => {
  const d = parse('node a "Events" kafka\nnode b "Docs" mongodb\nnode c "Bucket" s3\nnode d "Data" volume\nnode e "Share" nfs');
  assert.deepEqual(d.nodes.map((n) => n.kind), ['stream', 'document', 'storage', 'disk', 'disk']);
});

test('a misspelt kind suggests a close one, including familiar names', () => {
  assert.match(messages('node a "A" kafak'), /Did you mean "kafka"\?/);
});

// ------------------------------------------------------------------ networking

import { NETWORK } from './fixtures.mjs';

test('the network sample parses with no problems', () => {
  assert.deepEqual(check(NETWORK), []);
});

test('network kinds, aliases, addresses and ports are read', () => {
  const d = parse(NETWORK);
  const by = (id) => d.nodes.find((n) => n.id === id);
  assert.deepEqual(['laptop', 'ap', 'router', 'net', 'fw', 'lb', 'web', 'dns'].map((id) => by(id).kind),
    ['client', 'accesspoint', 'router', 'internet', 'firewall', 'loadbalancer', 'server', 'dns']);
  assert.deepEqual(by('router').ip, ['192.168.1.1', '203.0.113.7']);
  assert.deepEqual(by('lb').ports, ['80', '443']);
  assert.equal(by('dns').ip[0], '2001:db8::53');
  assert.equal(d.groups.find((g) => g.id === 'lan').cidr, '192.168.1.0/24');
  assert.equal(d.groups.find((g) => g.id === 'dmz').kind, 'dmz');
});

test('bad addresses, ports and prefixes are explained', () => {
  assert.match(messages('node a "A" router ip=10.0.0.256'), /not a valid IPv4 address/);
  assert.match(messages('node a "A" router ip=10.0.0'), /not a valid IPv4 address/);
  assert.match(messages('node a "A" router ip=10.0.0.1/33'), /not a valid prefix/);
  assert.match(messages('node a "A" server ports=70000'), /not a valid port/);
  assert.match(messages('node a "A" server ports=https'), /not a port/);
  assert.match(messages('node a "A" server ports=900-80'), /lowest first/);
  assert.match(messages('node a "A" router ip="zzzz::1"'), /not a valid IPv6/);
  assert.match(messages('group g "G" lan cidr=10.0.0.0'), /needs a prefix/);
  assert.match(messages('group g "G" lan size=3'), /cidr=/);
  assert.match(messages('node a "A" routr'), /Did you mean "router"/);
});
