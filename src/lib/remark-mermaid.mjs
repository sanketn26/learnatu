/**
 * Turns ```mermaid fenced blocks into <pre class="mermaid">…source…</pre>.
 * The diagram source stays in the page as plain text (readable without JavaScript, and a fallback if drawing
 * fails); src/scripts/diagrams.ts draws it in the browser, and only loads the Mermaid library on pages that have one.
 */
export default function remarkMermaid() {
  const walk = (node) => {
    if (!Array.isArray(node.children)) return;
    node.children = node.children.map((child) => {
      if (child.type === 'code' && child.lang === 'mermaid') {
        return {
          type: 'mermaid', value: child.value,
          data: { hName: 'pre', hProperties: { className: ['mermaid'] }, hChildren: [{ type: 'text', value: child.value }] }
        };
      }
      walk(child);
      return child;
    });
  };
  return (tree) => walk(tree);
}
