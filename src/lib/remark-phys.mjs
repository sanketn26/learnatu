import { check } from '@learnatu/physmap';

/**
 * Turns ```phys fenced blocks into <pre class="phys">…source…</pre>.
 * The scene text stays in the page (readable without JavaScript); src/scripts/phys.ts draws it in the browser,
 * and only loads the physics code on pages that have one. Mistakes in the text fail the build (or the upload
 * check) with the file name, the scene number and the line, like quizzes do.
 * Pictures a scene names (backdrop, sprite) are looked up in `node.data.physImages` when an earlier step set it
 * (uploaded courses map each name to /media/<course>/…); the page gets that map as data-images.
 * Language: packages/physmap/README.md
 */
export default function remarkPhys() {
  return (tree, file) => {
    let counter = 0;
    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child.type === 'code' && child.lang === 'phys') {
          const index = ++counter;
          const problems = check(child.value);
          if (problems.length) {
            const where = file?.path ?? 'markdown';
            throw new Error(problems.map((p) => `${where}: physics scene #${index}, line ${p.line}: ${p.message}`).join('\n'));
          }
          const images = child.data?.physImages;
          return {
            type: 'physmap', value: child.value,
            data: {
              hName: 'pre',
              hProperties: { className: ['phys'], ...(images && Object.keys(images).length ? { dataImages: JSON.stringify(images) } : {}) },
              hChildren: [{ type: 'text', value: child.value }]
            }
          };
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}
