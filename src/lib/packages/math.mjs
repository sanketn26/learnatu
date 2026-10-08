import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import katex from 'katex';

/**
 * Checks the formulas in a lesson: every $inline$ and $$display$$ formula is run through KaTeX, which reports
 * what it cannot read. Returns [{ line, message }] with the line inside the text you gave it.
 * (Formulas inside code blocks or `code` are not formulas, so they are not checked.)
 */
export function checkMath(markdown) {
  const tree = unified().use(remarkParse).use(remarkMath).parse(markdown);
  const problems = [];
  const walk = (node) => {
    if (node.type === 'math' || node.type === 'inlineMath') {
      try {
        katex.renderToString(node.value, { displayMode: node.type === 'math', throwOnError: true });
      } catch (e) {
        problems.push({ line: node.position?.start.line ?? 1, message: String(e.message).replace(/^KaTeX parse error: /, '') });
      }
    }
    node.children?.forEach(walk);
  };
  walk(tree);
  return problems;
}
