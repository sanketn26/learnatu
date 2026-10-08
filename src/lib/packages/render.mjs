import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeMathErrors from '../rehype-math-errors.mjs';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkQuiz from '../remark-quiz.mjs';
import rehypeHighlight from './highlight.mjs';
import remarkCodeExtras from '../remark-code-extras.mjs';
import remarkMermaid from '../remark-mermaid.mjs';
import remarkFlow from '../remark-flow.mjs';
import rewriteMarkdownLinks from '../rewrite-markdown-links.mjs';
import { resolveAsset } from './check.mjs';

/**
 * Turns an uploaded lesson's Markdown into HTML once, at upload time (so reading a lesson is just a database read).
 * Same Markdown features as the built-in courses: tables, callouts, quizzes, code tabs and colouring, Mermaid and flow diagrams, and maths (KaTeX, drawn here once so readers download no maths code).
 * Raw HTML inside Markdown is dropped on purpose.
 */

/** Points images at /media/<course>/… and links to other lessons (`./other.md`) at their course URL. */
function remarkCourseLinks({ slug, fromPath, assets }) {
  const walk = (node) => {
    if (node.type === 'image' && typeof node.url === 'string' && !/^(https?:|data:|\/)/.test(node.url)) {
      const found = resolveAsset(node.url, fromPath, assets);
      if (found) node.url = `/media/${slug}/${found}`;
    }
    if (node.type === 'link' && typeof node.url === 'string') {
      const match = node.url.match(/^(?!https?:|\/)(.*?)([^/]+)\.md(#[^\s]*)?$/);
      if (match) node.url = `/courses/${slug}/${match[2]}/${match[3] ?? ''}`;
    }
    node.children?.forEach(walk);
  };
  return () => (tree) => walk(tree);
}

export async function renderMarkdown(markdown, { slug, fromPath = 'course.md', assets = new Set() }) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkCourseLinks({ slug, fromPath, assets })) // before the callout plugin, which would treat .md links as library pages
    .use(rewriteMarkdownLinks)
    .use(remarkQuiz)
    .use(remarkMermaid)
    .use(remarkFlow)
    .use(remarkCodeExtras)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeMathErrors)
    .use(rehypeHighlight) // same colours as the built-in courses
    .use(rehypeStringify)
    .process({ value: markdown, path: fromPath });
  return String(result);
}
