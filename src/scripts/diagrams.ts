export {};
/**
 * Draws ```mermaid blocks (<pre class="mermaid">). The Mermaid library is big, so it is only downloaded
 * on pages that actually contain a diagram. Colours come from the site's theme tokens and are redrawn when it changes.
 * If a diagram has a mistake, its source text stays visible with a short note instead of a blank space.
 */
const blocks = Array.from(document.querySelectorAll<HTMLElement>('pre.mermaid'));

if (blocks.length) {
  blocks.forEach((block) => { block.dataset.source = block.textContent ?? ''; });
  const root = document.documentElement;
  const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

  /** Mermaid's colours, taken from the site's own tokens so diagrams match every theme (original, white, dark). */
  const themeVariables = () => {
    const css = getComputedStyle(root);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    return {
      darkMode: isDark(),
      fontFamily: getComputedStyle(document.body).fontFamily,
      background: token('--surface', '#ffffff'),
      primaryColor: token('--brand-soft', '#dcf5eb'),
      primaryBorderColor: token('--brand', '#087f6b'),
      primaryTextColor: token('--ink', '#17332e'),
      secondaryColor: token('--surface', '#ffffff'),
      tertiaryColor: token('--paper', '#fbfdf8'),
      lineColor: token('--muted', '#60706c'),
      textColor: token('--ink', '#17332e'),
      noteBkgColor: token('--warn-bg', '#fff2da'),
      noteTextColor: token('--ink', '#17332e'),
      noteBorderColor: token('--warn', '#b8790a')
    };
  };

  const draw = async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: themeVariables() });
    for (const [index, block] of blocks.entries()) {
      const source = block.dataset.source!;
      try {
        const { svg } = await mermaid.render(`diagram-${index}-${Date.now()}`, source);
        block.innerHTML = svg;
        block.classList.add('is-drawn');
        block.classList.remove('has-error');
        block.removeAttribute('title');
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
