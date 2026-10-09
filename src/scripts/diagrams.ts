export {};
/**
 * Draws ```flow, ```algo and ```phys blocks (<pre class="flow|algo|phys">) as live figures. Each package's code is
 * only downloaded on pages that actually contain one of its blocks. If it fails to load, or one block fails to
 * draw, the text stays visible and the other blocks carry on.
 */
interface Mount { (host: HTMLElement, source: string, options: { idPrefix: string; resolveImage?: (ref: string) => string }): unknown }
interface Kind { lang: string; prefix: string; host: string; what: string; load: () => Promise<Mount> }

const KINDS: Kind[] = [
  { lang: 'flow', prefix: 'fm', host: 'flowmap-host', what: 'flow diagrams', load: async () => (await import('@learnatu/flowmap/dom')).mountFlowmap },
  { lang: 'algo', prefix: 'am', host: 'algomap-host', what: 'algorithm diagrams', load: async () => (await import('@learnatu/algomap/dom')).mountAlgomap },
  { lang: 'phys', prefix: 'pm', host: 'physmap-host', what: 'physics scenes', load: async () => (await import('@learnatu/physmap/dom')).mountPhysmap }
];

for (const kind of KINDS) {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>(`pre.${kind.lang}`));
  if (!blocks.length) continue;
  kind.load().then((mount) => {
    blocks.forEach((pre, index) => {
      let images: Record<string, string> = {};
      try { images = JSON.parse(pre.dataset.images ?? '{}'); } catch { /* no pictures */ }
      const host = document.createElement('div');
      host.className = kind.host;
      pre.after(host);
      try {
        mount(host, pre.textContent ?? '', { idPrefix: `${kind.prefix}${index + 1}`, resolveImage: (ref) => images[ref] ?? ref });
        pre.remove();
      } catch (error) {
        host.remove();
        console.error(`Could not draw ${kind.what}`, error);
      }
    });
  }).catch((error) => console.error(`Could not load ${kind.what}`, error));
}
