import { check as checkFlow } from '@learnatu/flowmap';
import { check as checkAlgo } from '@learnatu/algomap';
import { check as checkPhys, parsePhys } from '@learnatu/physmap';
import { check as checkPy } from '@learnatu/pyrun';
import { check as checkTs } from '@learnatu/tsrun';

/**
 * Every kind of text diagram a lesson can hold, in one place. To add a package, add one entry here and one in
 * src/scripts/diagrams.ts (which loads its browser code); the Markdown plugin, the upload check and the
 * course-folder check all read this list.
 *
 *   lang     the fence name: ```flow
 *   label    how a mistake names it: "flow diagram #2, line 5: …"
 *   check    (text, { hasImage }) → [{ line, message }]
 *   images   optional: (text) → the picture names the text refers to, so the page can map them to addresses
 */
export const DIAGRAM_KINDS = [
  { lang: 'pyrun', label: 'Python block', check: (text) => checkPy(text) },
  { lang: 'tsrun', label: 'TypeScript block', check: (text) => checkTs(text) },
  { lang: 'flow', label: 'flow diagram', check: (text) => checkFlow(text) },
  { lang: 'algo', label: 'algorithm diagram', check: (text) => checkAlgo(text) },
  {
    lang: 'phys', label: 'physics scene',
    check: (text, options) => checkPhys(text, options),
    images: (text) => (parsePhys(text).scene?.images ?? []).map((i) => i.ref)
  }
];

export const diagramKind = (lang) => DIAGRAM_KINDS.find((kind) => kind.lang === lang);
