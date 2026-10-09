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

test('unsafe URL schemes are removed from links and directive images', async () => {
  for (const url of ['javascript:alert%281%29', 'JaVaScRiPt:alert%281%29', 'vbscript:msgbox%281%29', 'data:text/html,hello']) {
    assert.doesNotMatch(await render(`[click](${url})`), /href=/);
  }
  assert.doesNotMatch(await render('::figure{src="javascript:alert(1)" alt="test"}'), /src=/);
  assert.match(await render('[email](mailto:hello@example.com) [phone](tel:123) [section](#top)'), /href="mailto:hello@example.com"/);
  assert.match(await render('[section](#top)'), /href="#top"/);
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
  assert.match(code, /data-language="js"/);
  assert.match(code, /color:#B392F0/); // syntax colours (Shiki), same as the built-in courses
});

test('a broken quiz throws with the file name so the upload can report it', async () => {
  await assert.rejects(render('```quiz\ntype: single\nquestion: Q\n```'), /en\/one\.md/);
});

test('a mermaid block stays as plain text for the browser to draw, and is not colourised', async () => {
  const html = await render('```mermaid\ngraph TD; A-->B;\n```');
  assert.match(html, /^<pre class="mermaid">graph TD; A-->B;<\/pre>/);
  assert.doesNotMatch(html, /astro-code/);
});

test('code in other common languages is coloured too, and unknown ones still show', async () => {
  const py = await render('```py\nprint("hi")\n```');
  assert.match(py, /data-language="py"/);
  assert.match(py, /color:#/);
  const unknown = await render('```klingon\nqapla\n```');
  assert.match(unknown, /<pre data-language="klingon"><code class="language-klingon">qapla/);
});

test('maths: inline and display formulas are drawn once, with a screen-reader version', async () => {
  const html = await render('Energy is $E = mc^2$ here.\n\n$$\n\\frac{a}{b} + \\sqrt{x}\n$$');
  assert.match(html, /class="katex"/);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /<math/); // MathML for assistive technology
  assert.match(html, /m<\/mi>|mc|c<\/mi>/);
});

test('a dollar amount can be written with a backslash and is not a formula', async () => {
  const html = await render('It costs \\$5 and \\$10.');
  assert.doesNotMatch(html, /katex/);
  assert.match(html, /\$5 and \$10/);
});

test('a formula KaTeX cannot read stops the render with a clear message', async () => {
  await assert.rejects(render('Bad: $\\notacommand{x}$'), /notacommand/);
});

test('formulas inside code are left alone', async () => {
  const html = await render('Use `$x^2$` like this:\n\n```\n$$y$$\n```');
  assert.doesNotMatch(html, /class="katex"/);
});

test('info blocks: type, title, and markdown inside', async () => {
  const html = await render(':::tip[Pro tip]\nUse **short** lessons.\n\n- one\n- two\n:::');
  assert.match(html, /<aside class="block block-tip" aria-label="Tip">/);
  assert.match(html, /<p class="block-title">Pro tip<\/p>/);
  assert.match(html, /<strong>short<\/strong>/);
  assert.match(html, /<li>one<\/li>/);
});

test('an info block without a title uses its type as the title', async () => {
  assert.match(await render(':::warning\nCareful.\n:::'), /<p class="block-title">Warning<\/p>/);
});

test('collapsible blocks use real details and summary, and can start open', async () => {
  const closed = await render(':::details[Show the answer]\nForty-two.\n:::');
  assert.match(closed, /<details class="block block-details">\s*<summary>Show the answer<\/summary>/);
  assert.doesNotMatch(closed, /<details[^>]* open/);
  assert.match(await render(':::details[More]{open}\nx\n:::'), /<details class="block block-details" open>/);
});

test('figures: caption, alignment, width, lazy loading, and the uploaded address', async () => {
  const html = await render('::figure[A budget sheet]{src="../images/b.png" alt="A sheet" align=right width=40%}', ['images/b.png']);
  assert.match(html, /<figure class="figure figure-right" style="width:40%">/);
  assert.match(html, /src="\/media\/demo\/images\/b\.png" alt="A sheet" loading="lazy"/);
  assert.match(html, /<figcaption>A budget sheet<\/figcaption>/);
});

test('a normal image with a title becomes a captioned figure', async () => {
  const html = await render('![A chart](../images/c.png "Figure 1. A chart")', ['images/c.png']);
  assert.match(html, /<figure class="figure"><img[^>]+><figcaption>Figure 1\. A chart<\/figcaption><\/figure>/);
});

test('a gallery gives every image its own figure', async () => {
  const html = await render(':::gallery\n![One](a.png "First")\n![Two](b.png "Second")\n:::');
  assert.equal((html.match(/<figure class="figure">/g) ?? []).length, 2);
  assert.match(html, /<div class="gallery">/);
});

test('wrong blocks stop the render with the file and line', async () => {
  await assert.rejects(render(':::wat\nx\n:::'), /en\/one\.md: line 1: unknown block ":::wat"/);
  await assert.rejects(render('::figure{src="a.png"}'), /needs alt=/);
  await assert.rejects(render('::figure{src="a.png" alt="x" align=middle}'), /align must be one of/);
  await assert.rejects(render('::figure{src="a.png" alt="x" width=5%}'), /between 10% and 100%/);
});

test('a time like 10:30 or a stray :word stays plain text', async () => {
  const html = await render('Meet at 10:30 and see :tip here.');
  assert.match(html, /Meet at 10:30 and see :tip here\./);
});

test('a pyrun block keeps its text in a pre for the browser to upgrade, and bad options fail the render', async () => {
  const html = await render('```pyrun\n#@ title "Squares"\nprint(1 < 2)\n```');
  assert.match(html, /<pre class="pyrun">/);
  assert.match(html, /print\(1 &#x3C; 2\)|print\(1 &lt; 2\)/);
  await assert.rejects(() => render('```pyrun\n#@ timeout 999\nprint(1)\n```'), /Python block #1, line 1: timeout is a number of seconds/);
});
