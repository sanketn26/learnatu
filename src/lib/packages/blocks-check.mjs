import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { directiveProblem } from '../remark-blocks.mjs';
import { resolveAsset } from './assets.mjs';

const EXTERNAL = /^(https?:|data:|\/|#)/;

/**
 * Checks the rich blocks and images of a lesson without drawing anything:
 *   - info blocks, details, gallery and ::figure are written correctly
 *   - every image has alt text (a description for readers who cannot see it)
 *   - every image that points into the zip exists there
 * Returns [{ line, message }], with lines counted inside the text given.
 */
export function checkBlocks(markdown, { assets = new Set(), fromPath = 'en/lesson.md' } = {}) {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(markdown);
  const problems = [];
  const add = (node, message) => problems.push({ line: node.position?.start.line ?? 1, message });
  const checkSource = (node, ref) => {
    if (ref && !EXTERNAL.test(ref) && !resolveAsset(ref, fromPath, assets)) add(node, `image "${ref}" is not in the zip`);
  };
  const walk = (node) => {
    if (node.type === 'containerDirective' || node.type === 'leafDirective') {
      const problem = directiveProblem(node);
      if (problem) add(node, problem);
      if (node.type === 'leafDirective' && !problem) checkSource(node, node.attributes?.src);
    } else if (node.type === 'textDirective' && (node.children?.length || Object.keys(node.attributes ?? {}).length)) {
      add(node, `":${node.name}" looks like a directive. Write \\: to show a colon.`);
    } else if (node.type === 'image') {
      if (!node.alt || !node.alt.trim()) add(node, 'an image needs alt text, written between the square brackets, describing the picture for readers who cannot see it');
      checkSource(node, node.url);
    }
    node.children?.forEach(walk);
  };
  walk(tree);
  return problems;
}
