import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBlocks } from '../src/lib/packages/blocks-check.mjs';

const check = (md, assets = []) => checkBlocks(md, { assets: new Set(assets), fromPath: 'en/x.md' });

test('good blocks and images have no problems', () => {
  assert.deepEqual(check(':::tip[T]\nok\n:::\n\n![A chart](../images/c.png "Caption")\n\n::figure[Cap]{src="../images/c.png" alt="A chart" align=left width=30%}', ['images/c.png']), []);
});

test('an image without alt text is reported with its line', () => {
  const problems = check('Text\n\n![](../images/c.png)', ['images/c.png']);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 3);
  assert.match(problems[0].message, /needs alt text/);
});

test('an image that is not in the zip is reported, external ones are not', () => {
  assert.match(check('![x](../images/missing.png)')[0].message, /not in the zip/);
  assert.deepEqual(check('![x](https://example.com/a.png) ![y](/images/a.png)'), []);
});

test('::figure needs src and alt, and its source must exist', () => {
  assert.match(check('::figure{alt="x"}')[0].message, /needs src/);
  assert.match(check('::figure{src="../images/a.png"}', ['images/a.png'])[0].message, /needs alt/);
  assert.match(check('::figure{src="../images/a.png" alt="x"}')[0].message, /not in the zip/);
});

test('unknown blocks, and examples inside code, are handled', () => {
  assert.match(check(':::sparkle\nx\n:::')[0].message, /unknown block/);
  assert.deepEqual(check('```\n:::sparkle\n![](a.png)\n```\n\nand `![](b.png)`'), []);
});
