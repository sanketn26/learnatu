export {};
/**
 * Draws ```algo blocks (<pre class="algo">) as step-by-step diagrams. The diagram code is only downloaded on pages
 * that actually contain one. If it fails to load, the text of the diagram stays visible.
 */
const blocks = Array.from(document.querySelectorAll<HTMLElement>('pre.algo'));

if (blocks.length) {
  import('@learnatu/algomap/dom').then(({ mountAlgomap }) => {
    blocks.forEach((pre, index) => {
      const host = document.createElement('div');
      host.className = 'algomap-host';
      pre.after(host);
      try {
        mountAlgomap(host, pre.textContent ?? '', { idPrefix: `am${index + 1}` });
        pre.remove();
      } catch (error) {
        host.remove(); // keep the text of this diagram visible and carry on with the others
        console.error('Could not draw a diagram', error);
      }
    });
  }).catch((error) => console.error('Could not load algorithm diagrams', error));
}
