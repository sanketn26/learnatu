import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/lib/packages/render.mjs';

const render = (md, assets = []) => renderMarkdown(md, { slug: 'demo', fromPath: 'en/one.md', assets: new Set(assets) });

test('basic Markdown and tables render', async () => {
  const html = await render('Hello **world**\n\n| a | b |\n|---|---|\n| 1 | 2 |');
  assert.match(html, /<strong>world<\/strong>/);
  assert.match(html, /<table>/);
});

test('raw HTML and scripts are dropped', async () => {
  const html = await render('Hi <script>alert(1)</script> there\n\n<img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<script|onerror/);
});

test('images point at the course media URL', async () => {
  const html = await render('![chart](../images/chart.png)', ['images/chart.png']);
  assert.match(html, /src="\/media\/demo\/images\/chart\.png"/);
});

test('links to other lessons become course URLs; other links are untouched', async () => {
  const html = await render('[next](./two.md#top) and [site](https://example.com)');
  assert.match(html, /href="\/courses\/demo\/two\/#top"/);
  assert.match(html, /href="https:\/\/example\.com"/);
});

test('a quiz becomes an interactive container with its data', async () => {
  const html = await render('```quiz\ntype: truefalse\nquestion: Sky is blue?\nanswer: true\n```');
  assert.match(html, /class="quiz"/);
  assert.match(html, /data-quiz="/);
});

test('callouts and code languages', async () => {
  const callout = await render('!!! warning "Careful"\nOne\nTwo');
  assert.match(callout, /callout-warning/);
  const code = await render('```js\nconsole.log(1)\n```');
  assert.match(code, /<pre data-language="js">/);
});

test('a broken quiz throws with the file name so the upload can report it', async () => {
  await assert.rejects(render('```quiz\ntype: single\nquestion: Q\n```'), /en\/one\.md/);
});
