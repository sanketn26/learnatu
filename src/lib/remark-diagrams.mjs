import { diagramKind } from './diagram-kinds.mjs';

/**
 * Turns ```flow, ```algo, ```phys and ```pyrun fenced blocks into <pre class="flow|algo|phys|pyrun">…source…</pre>.
 * The text stays in the page (readable without JavaScript); src/scripts/diagrams.ts draws it in the browser,
 * and only loads each package's code on pages that have one. Mistakes in the text fail the build (or the upload
 * check) with the file name, the diagram number and the line, like quizzes do.
 * Pictures a diagram names are looked up in `node.data.diagramImages` when an earlier step set it (uploaded
 * courses map each name to /media/<course>/…); the page gets that map as data-images.
 * Languages: packages/<name>/README.md. The list of kinds is in diagram-kinds.mjs.
 */
export default function remarkDiagrams() {
  return (tree, file) => {
    const counters = new Map();
    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        const kind = child.type === 'code' ? diagramKind(child.lang) : undefined;
        if (kind) {
          const index = (counters.get(kind.lang) ?? 0) + 1;
          counters.set(kind.lang, index);
          const problems = kind.check(child.value);
          if (problems.length) {
            const where = file?.path ?? 'markdown';
            throw new Error(problems.map((p) => `${where}: ${kind.label} #${index}, line ${p.line}: ${p.message}`).join('\n'));
          }
          const images = child.data?.diagramImages;
          return {
            type: 'diagram', value: child.value,
            data: {
              hName: 'pre',
              hProperties: { className: [kind.lang], ...(images && Object.keys(images).length ? { dataImages: JSON.stringify(images) } : {}) },
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
