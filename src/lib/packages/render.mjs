import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkBlocks from '../remark-blocks.mjs';
import rehypeKatex from 'rehype-katex';
import rehypeMathErrors from '../rehype-math-errors.mjs';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkQuiz from '../remark-quiz.mjs';
import rehypeHighlight from './highlight.mjs';
import remarkCodeExtras from '../remark-code-extras.mjs';
import remarkMermaid from '../remark-mermaid.mjs';
import remarkFlow from '../remark-flow.mjs';
import remarkAlgo from '../remark-algo.mjs';
import remarkPhys from '../remark-phys.mjs';
import { parsePhys } from '@learnatu/physmap';
import rewriteMarkdownLinks from '../rewrite-markdown-links.mjs';
import { resolveAsset } from './assets.mjs';

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
    // pictures named inside a ```phys scene (backdrop, sprite) get the same /media/ addresses as Markdown images
    if (node.type === 'code' && node.lang === 'phys') {
      const { scene } = parsePhys(node.value);
      const images = {};
      for (const { ref } of scene?.images ?? []) {
        if (/^(https?:|data:|\/)/.test(ref)) continue;
        const found = resolveAsset(ref, fromPath, assets);
        if (found) images[ref] = `/media/${slug}/${found}`;
      }
      node.data = { ...node.data, physImages: images };
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
    .use(remarkDirective)
    .use(remarkBlocks)
    .use(remarkCourseLinks({ slug, fromPath, assets })) // before the callout plugin, which would treat .md links as library pages
    .use(rewriteMarkdownLinks)
    .use(remarkQuiz)
    .use(remarkMermaid)
    .use(remarkFlow)
    .use(remarkAlgo)
    .use(remarkPhys)
    .use(remarkCodeExtras)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeMathErrors)
    .use(rehypeHighlight) // same colours as the built-in courses
    .use(rehypeStringify)
    .process({ value: markdown, path: fromPath });
  return String(result);
}
