import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../src/tokenize.ts';

test('words, strings, operators and attributes', () => {
  const { tokens } = tokenize('node db "Orders DB" database capacity=100 badge="92%"');
  assert.deepEqual(tokens, [
    { type: 'word', text: 'node' }, { type: 'word', text: 'db' }, { type: 'string', text: 'Orders DB' }, { type: 'word', text: 'database' },
    { type: 'attr', key: 'capacity', value: '100' }, { type: 'attr', key: 'badge', value: '92%' }
  ]);
});

test('arrows need no spaces, and dashes inside names are kept', () => {
  const { tokens } = tokenize('my-api->db <-> cache <- q');
  assert.deepEqual(tokens.map((t) => t.text ?? t.type), ['my-api', '->', 'db', '<->', 'cache', '<-', 'q']);
});

test('comments are ignored, but # inside a string is kept', () => {
  assert.deepEqual(tokenize('a -> b # not this').tokens.length, 3);
  assert.deepEqual(tokenize('title "Issue #4"').tokens[1], { type: 'string', text: 'Issue #4' });
});

test('lists in attributes and a colon after a header', () => {
  const { tokens } = tokenize('flow f rate=60: a -> b');
  assert.deepEqual(tokens.find((t) => t.type === 'colon'), { type: 'colon' });
  assert.deepEqual(tokenize('x zones=za,zb').tokens[1], { type: 'attr', key: 'zones', value: 'za,zb' });
});

test('an unclosed quote is reported', () => {
  assert.match(tokenize('title "oops').error, /quote/);
});
