export {};
/**
 * Draws ```flow blocks (<pre class="flow">) as animated diagrams. The diagram code is only downloaded on pages
 * that actually contain one. If it fails to load, the text of the diagram stays visible.
 */
const blocks = Array.from(document.querySelectorAll<HTMLElement>('pre.flow'));

if (blocks.length) {
  import('@learnatu/flowmap/dom').then(({ mountFlowmap }) => {
    blocks.forEach((pre, index) => {
      const host = document.createElement('div');
      host.className = 'flowmap-host';
      pre.replaceWith(host);
      mountFlowmap(host, pre.textContent ?? '', { idPrefix: `fm${index + 1}` });
    });
  }).catch((error) => console.error('Could not load flow diagrams', error));
}
