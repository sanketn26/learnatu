import test from 'node:test';
import assert from 'node:assert/strict';
import rewriteMarkdownLinks from '../src/lib/rewrite-markdown-links.mjs';

// A tiny hand-made Markdown tree with one link, run through the plugin.
const run = (url, filePath) => {
  const link = { type: 'link', url, children: [] };
  rewriteMarkdownLinks()({ type: 'root', children: [link] }, { path: filePath });
  return link.url;
};

test('links to other .md pages become site addresses, in every language', () => {
  assert.equal(run('../basics/whatsapp.md', '/x/docs/en/help/hacked-account.md'), '/safety/communication/whatsapp/');
  assert.equal(run('../basics/whatsapp.md', '/x/docs/hi/help/hacked-account.md'), '/safety/communication/whatsapp/');
});

test('anchors are kept and normal links are untouched', () => {
  assert.equal(run('../about.md#who', '/x/docs/en/help/a.md'), '/about/#who');
  assert.equal(run('https://example.com', '/x/docs/en/help/a.md'), 'https://example.com');
});

test('callouts like !!! warning "Title" become styled blockquotes', () => {
  const para = { type: 'paragraph', children: [{ type: 'text', value: '!!! warning "Careful"\n- one\n- two' }] };
  rewriteMarkdownLinks()({ type: 'root', children: [para] }, { path: '/x/docs/en/a.md' });
  assert.equal(para.type, 'blockquote');
  assert.deepEqual(para.data.hProperties.className, ['callout', 'callout-warning']);
  assert.equal(para.children[1].children.length, 2);
});
