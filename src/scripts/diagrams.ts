export {};
/**
 * Draws ```mermaid blocks (<pre class="mermaid">). The Mermaid library is big, so it is only downloaded
 * on pages that actually contain a diagram. Diagrams follow the site theme and are redrawn when it changes.
 * If a diagram has a mistake, its source text stays visible with a short note instead of a blank space.
 */
const blocks = Array.from(document.querySelectorAll<HTMLElement>('pre.mermaid'));

if (blocks.length) {
  blocks.forEach((block) => { block.dataset.source = block.textContent ?? ''; });
  const root = document.documentElement;
  const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

  const draw = async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark() ? 'dark' : 'default' });
    for (const [index, block] of blocks.entries()) {
      const source = block.dataset.source!;
      try {
        const { svg } = await mermaid.render(`diagram-${index}-${Date.now()}`, source);
        block.innerHTML = svg;
        block.classList.add('is-drawn');
        block.classList.remove('has-error');
      } catch {
        block.textContent = source;
        block.classList.add('has-error');
        block.setAttribute('title', 'This diagram could not be drawn. Check its syntax.');
      }
    }
  };

  draw();
  new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
}
