import { check } from '@learnatu/algomap';

/**
 * Turns ```algo fenced blocks into <pre class="algo">…source…</pre>.
 * The diagram text stays in the page (readable without JavaScript); src/scripts/algos.ts draws it in the browser,
 * and only loads the diagram code on pages that have one. Mistakes in the text fail the build (or the upload
 * check) with the file name, the diagram number and the line, like quizzes do.
 * Language: packages/algomap/README.md
 */
export default function remarkAlgo() {
  return (tree, file) => {
    let counter = 0;
    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child.type === 'code' && child.lang === 'algo') {
          const index = ++counter;
          const problems = check(child.value);
          if (problems.length) {
            const where = file?.path ?? 'markdown';
            throw new Error(problems.map((p) => `${where}: algorithm diagram #${index}, line ${p.line}: ${p.message}`).join('\n'));
          }
          return {
            type: 'algomap', value: child.value,
            data: { hName: 'pre', hProperties: { className: ['algo'] }, hChildren: [{ type: 'text', value: child.value }] }
          };
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}
