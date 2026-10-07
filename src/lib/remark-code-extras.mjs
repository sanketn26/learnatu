/**
 * Extras for fenced code blocks (syntax highlighting itself is Shiki, which supports every common language).
 *
 *   ```js title="app.js"          → block with a file-name caption
 *   ```python tab="Python"       → consecutive blocks that each have tab="…" become ONE tabbed group
 *   ```js tab="JavaScript"
 *
 * The client script (src/scripts/code-blocks.ts) adds the language label, copy button and tab switching.
 */
const META = /(\w+)="([^"]*)"/g;

const parseMeta = (meta) => Object.fromEntries([...(meta ?? '').matchAll(META)].map(([, key, value]) => [key, value]));
const isCode = (node) => node.type === 'code' && node.lang !== 'quiz';
const container = (tag, className, children, props = {}) => ({
  type: 'blockquote', data: { hName: tag, hProperties: { className: [className], ...props } }, children
});

function transform(children) {
  const out = [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (!isCode(node)) { if (Array.isArray(node.children)) node.children = transform(node.children); out.push(node); continue; }
    const meta = parseMeta(node.meta);
    if (meta.tab) {
      const tabs = [];
      while (i < children.length && isCode(children[i]) && parseMeta(children[i].meta).tab) {
        const tabMeta = parseMeta(children[i].meta);
        tabs.push(container('div', 'code-tab', [children[i]], { dataTab: tabMeta.tab }));
        i++;
      }
      i--;
      out.push(container('div', 'code-tabs', tabs));
    } else if (meta.title) {
      out.push(container('figure', 'code-figure', [
        { type: 'paragraph', data: { hName: 'figcaption' }, children: [{ type: 'text', value: meta.title }] }, node
      ]));
    } else {
      out.push(node);
    }
  }
  return out;
}

export default function remarkCodeExtras() {
  return (tree) => { tree.children = transform(tree.children); };
}
