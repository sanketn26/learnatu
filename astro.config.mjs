import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { unified } from '@astrojs/markdown-remark';
import rewriteMarkdownLinks from './src/lib/rewrite-markdown-links.mjs';
import remarkQuiz from './src/lib/remark-quiz.mjs';
import remarkCodeExtras from './src/lib/remark-code-extras.mjs';
import remarkMermaid from './src/lib/remark-mermaid.mjs';
import remarkFlow from './src/lib/remark-flow.mjs';
import legacyRedirects from './src/data/legacy-redirects.json' with { type: 'json' };

export default defineConfig({
  site: 'https://learnatu.com',
  // Pages are prerendered by default; account, course-player and API routes opt out with `prerender = false`.
  output: 'static',
  adapter: cloudflare(),
  build: { format: 'directory' },
  // Lessons that moved into courses keep working at their old URLs.
  redirects: legacyRedirects,
  security: { checkOrigin: true },
  // The shared processor converts legacy callouts, internal links, ```quiz, ```mermaid and ```flow blocks and code-block titles / tabs.
  markdown: { processor: unified({ remarkPlugins: [rewriteMarkdownLinks, remarkQuiz, remarkMermaid, remarkFlow, remarkCodeExtras] }) }
});
