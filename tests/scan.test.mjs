import test from 'node:test';
import assert from 'node:assert/strict';
import { scanMarkdown } from '../src/lib/packages/scan.mjs';

test('finds fenced blocks with their language and text', () => {
  const { blocks } = scanMarkdown('intro\n\n```flow\na -> b\n```\n\ntext\n```quiz\ntype: single\n```');
  assert.deepEqual(blocks.map((b) => [b.lang, b.text]), [['flow', 'a -> b'], ['quiz', 'type: single']]);
});

test('a longer fence can show shorter fences inside it', () => {
  const { blocks } = scanMarkdown('````markdown\n```flow\na -> b\n```\n````\n\n```flow\nc -> d\n```');
  assert.deepEqual(blocks.map((b) => b.lang), ['markdown', 'flow']);
  assert.equal(blocks[1].text, 'c -> d');
});

test('prose leaves out code, so examples are not mistaken for content', () => {
  const { prose } = scanMarkdown('See `![alt](x.png)` and:\n```\n![alt](y.png)\n```\n![real](z.png)');
  assert.ok(!prose.includes('x.png') && !prose.includes('y.png'));
  assert.ok(prose.includes('z.png'));
});

test('an unclosed block still ends the file cleanly, and line numbers are kept', () => {
  const { blocks } = scanMarkdown('a\n```flow\nx -> y');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].line, 2);
});
