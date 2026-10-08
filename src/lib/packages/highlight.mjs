import { createHighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import githubDark from '@shikijs/themes/github-dark';
import bash from '@shikijs/langs/bash';
import c from '@shikijs/langs/c';
import cpp from '@shikijs/langs/cpp';
import csharp from '@shikijs/langs/csharp';
import css from '@shikijs/langs/css';
import diff from '@shikijs/langs/diff';
import dockerfile from '@shikijs/langs/dockerfile';
import go from '@shikijs/langs/go';
import html from '@shikijs/langs/html';
import java from '@shikijs/langs/java';
import javascript from '@shikijs/langs/javascript';
import json from '@shikijs/langs/json';
import jsx from '@shikijs/langs/jsx';
import kotlin from '@shikijs/langs/kotlin';
import markdown from '@shikijs/langs/markdown';
import php from '@shikijs/langs/php';
import python from '@shikijs/langs/python';
import ruby from '@shikijs/langs/ruby';
import rust from '@shikijs/langs/rust';
import sql from '@shikijs/langs/sql';
import tsx from '@shikijs/langs/tsx';
import typescript from '@shikijs/langs/typescript';
import yaml from '@shikijs/langs/yaml';

/**
 * Syntax colouring for uploaded courses, run once at upload time. Uses a fixed list of common languages
 * (not all of Shiki's) so the website's server bundle stays small; the built-in courses use Astro's full Shiki.
 * To add a language: import it above, add it to `langs`, and (if people write it another way) to `ALIASES`.
 * Code in a language not listed here still displays, just without colours.
 */
const langs = [bash, c, cpp, csharp, css, diff, dockerfile, go, html, java, javascript, json, jsx, kotlin, markdown, php, python, ruby, rust, sql, tsx, typescript, yaml];

export const ALIASES = {
  js: 'javascript', mjs: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
  py: 'python', yml: 'yaml', md: 'markdown', rb: 'ruby', rs: 'rust', cs: 'csharp', 'c++': 'cpp', kt: 'kotlin', docker: 'dockerfile'
};
const KNOWN = new Set(['bash', 'c', 'cpp', 'csharp', 'css', 'diff', 'dockerfile', 'go', 'html', 'java', 'javascript', 'json', 'jsx', 'kotlin', 'markdown', 'php', 'python', 'ruby', 'rust', 'sql', 'tsx', 'typescript', 'yaml']);

/** The language name Shiki knows for what an author wrote after the fence, or null. */
export const languageFor = (name) => {
  const lower = String(name ?? '').toLowerCase();
  const resolved = ALIASES[lower] ?? lower;
  return KNOWN.has(resolved) ? resolved : null;
};

let highlighter;
const getHighlighter = () => (highlighter ??= createHighlighterCore({ themes: [githubDark], langs, engine: createJavaScriptRegexEngine() }));

const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

/** rehype plugin: replaces <pre><code class="language-x"> with coloured markup (and adds data-language for the label). */
export default function rehypeHighlight() {
  return async (tree) => {
    const jobs = [];
    const walk = (parent) => {
      (parent.children ?? []).forEach((node, index) => {
        if (node.tagName === 'pre') {
          const code = node.children?.find((child) => child.tagName === 'code');
          const written = (code?.properties?.className ?? []).map(String).find((c) => c.startsWith('language-'))?.slice(9);
          if (code && written) jobs.push({ parent, index, written, source: textOf(code) });
        } else {
          walk(node);
        }
      });
    };
    walk(tree);
    if (!jobs.length) return;
    const shiki = await getHighlighter();
    for (const { parent, index, written, source } of jobs) {
      const lang = languageFor(written);
      if (!lang) {
        parent.children[index].properties = { ...parent.children[index].properties, dataLanguage: written };
        continue;
      }
      const pre = shiki.codeToHast(source.replace(/\n$/, ''), { lang, theme: 'github-dark' }).children[0];
      pre.properties = { ...pre.properties, dataLanguage: written };
      parent.children[index] = pre;
    }
  };
}
