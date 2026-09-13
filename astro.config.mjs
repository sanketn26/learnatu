import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rewriteMarkdownLinks from './src/lib/rewrite-markdown-links.mjs';

export default defineConfig({
  site: 'https://learnatu.com',
  output: 'static',
  build: { format: 'directory' },
  // The shared processor also converts legacy lesson callouts and internal links.
  markdown: { processor: unified({ remarkPlugins: [rewriteMarkdownLinks] }) }
});
