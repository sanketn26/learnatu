import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, suggest, list, esc, SyntaxProblems } from '../src/index.ts';

test('tokenize: words, quoted strings, key="value", comments', () => {
  const { tokens } = tokenize('body ball mass=2kg label="Red ball" # note');
  assert.deepEqual(tokens.map((t) => t.text), ['body', 'ball', 'mass=2kg', 'Red ball']);
  assert.equal(tokens[3].key, 'label');
  assert.match(tokenize('a "oops').error, /never closed/);
});
test('suggest only offers a close word', () => {
  assert.equal(suggest('mas', ['mass', 'body']), ' Did you mean "mass"?');
  assert.equal(suggest('zzzzzz', ['mass']), '');
});
test('list, esc and SyntaxProblems', () => {
  assert.equal(list(['a', 'b']), '"a", "b"');
  assert.equal(esc('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
  const e = new SyntaxProblems([{ line: 2, message: 'bad' }], 'X');
  assert.equal(e.message, 'line 2: bad');
  assert.equal(e.name, 'X');
});
