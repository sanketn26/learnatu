export {};
/**
 * Draws ```phys blocks (<pre class="phys">) as live physics scenes. The scene code is only downloaded on pages
 * that actually contain one. If it fails to load, the text of the scene stays visible.
 */
const blocks = Array.from(document.querySelectorAll<HTMLElement>('pre.phys'));

if (blocks.length) {
  import('@learnatu/physmap/dom').then(({ mountPhysmap }) => {
    blocks.forEach((pre, index) => {
      let images: Record<string, string> = {};
      try { images = JSON.parse(pre.dataset.images ?? '{}'); } catch { /* no pictures */ }
      const host = document.createElement('div');
      host.className = 'physmap-host';
      pre.replaceWith(host);
      mountPhysmap(host, pre.textContent ?? '', { idPrefix: `pm${index + 1}`, resolveImage: (ref) => images[ref] ?? ref });
    });
  }).catch((error) => console.error('Could not load physics scenes', error));
}
