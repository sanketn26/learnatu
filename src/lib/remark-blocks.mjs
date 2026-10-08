/**
 * Rich blocks written with the standard Markdown "directive" syntax (remark-directive), so they need no raw HTML
 * and work the same in git courses, uploaded zips and library pages.
 *
 *   :::tip[Title]          info blocks: note, info, tip, success, warning, danger
 *   text, lists, images...
 *   :::
 *
 *   :::details[Summary]    a collapsible block (add {open} to start open)
 *   :::
 *
 *   ::figure[Caption]{src="a.png" alt="Description" align=right width=40%}     an image with caption and placement
 *
 *   :::gallery             images side by side (stacked on a phone)
 *   ![alt](a.png "Caption")
 *   ![alt](b.png "Caption")
 *   :::
 *
 * A normal image on its own line, ![alt](a.png "Caption"), also becomes a figure with its caption.
 * Run this plugin after remark-directive and before the one that rewrites image addresses.
 */
export const BLOCK_TYPES = { note: 'Note', info: 'Info', tip: 'Tip', success: 'Success', warning: 'Warning', danger: 'Danger' };
export const ALIGNS = ['left', 'right', 'center', 'full'];

/** Returns a message when a directive is written wrongly, else null. Shared with the upload check. */
export function directiveProblem(node) {
  const name = node.name;
  const attrs = node.attributes ?? {};
  if (node.type === 'containerDirective') {
    if (name in BLOCK_TYPES || name === 'gallery') return null;
    if (name === 'details') return null;
    return `unknown block ":::${name}". Use one of: ${[...Object.keys(BLOCK_TYPES), 'details', 'gallery'].join(', ')}`;
  }
  if (node.type === 'leafDirective') {
    if (name !== 'figure') return `unknown "::${name}". The only single-line block is ::figure`;
    if (!attrs.src) return '::figure needs src="path-to-image"';
    if (!attrs.alt || !String(attrs.alt).trim()) return '::figure needs alt="description of the image" (for readers who cannot see it)';
    if (attrs.align && !ALIGNS.includes(attrs.align)) return `align must be one of: ${ALIGNS.join(', ')}`;
    if (attrs.width && !/^(\d{1,3}%|\d{2,4}px)$/.test(attrs.width)) return 'width must look like 40% or 320px';
    if (attrs.width?.endsWith('%') && (parseInt(attrs.width, 10) < 10 || parseInt(attrs.width, 10) > 100)) return 'width in percent must be between 10% and 100%';
  }
  return null;
}

const text = (value) => ({ type: 'text', value });
const label = (node) => {
  const first = node.children?.[0];
  return first?.data?.directiveLabel ? first.children : null;
};
const withoutLabel = (node) => (label(node) ? node.children.slice(1) : node.children);

/** Caption paragraph for a figure. */
const caption = (children) => ({ type: 'paragraph', data: { hName: 'figcaption' }, children });

function makeFigure(image, captionChildren, align, width) {
  const classes = ['figure', align ? `figure-${align}` : null].filter(Boolean);
  image.data = { ...image.data, hProperties: { ...image.data?.hProperties, loading: 'lazy', decoding: 'async' } };
  return {
    type: 'paragraph',
    data: { hName: 'figure', hProperties: { className: classes, ...(width ? { style: `width:${width}` } : {}) } },
    children: captionChildren?.length ? [image, caption(captionChildren)] : [image]
  };
}

const isStandaloneImage = (p) => p.type === 'paragraph' && p.children.length === 1 && p.children[0].type === 'image';

export default function remarkBlocks() {
  return (tree, file) => {
    const where = file?.path ?? 'markdown';
    const fail = (node, message) => { throw new Error(`${where}: line ${node.position?.start.line ?? '?'}: ${message}`); };

    const transform = (children) => children.map((node) => {
      // A colon that only looked like a directive (":30" in a time) goes back to plain text.
      if (node.type === 'textDirective') {
        if (!node.children?.length && !Object.keys(node.attributes ?? {}).length) return text(`:${node.name}`);
        fail(node, `":${node.name}" looks like a directive, but inline directives are not supported. Write \\: to show a colon.`);
      }
      if (node.type === 'containerDirective' || node.type === 'leafDirective') {
        const problem = directiveProblem(node);
        if (problem) fail(node, problem);
      }

      if (node.type === 'containerDirective') {
        node.children = transform(node.children ?? []);
        const title = label(node);
        const body = withoutLabel(node) ?? [];
        const name = node.name;
        if (name in BLOCK_TYPES) {
          const heading = { type: 'paragraph', data: { hName: 'p', hProperties: { className: ['block-title'] } }, children: title ?? [text(BLOCK_TYPES[name])] };
          return { type: 'blockquote', data: { hName: 'aside', hProperties: { className: ['block', `block-${name}`], ariaLabel: BLOCK_TYPES[name] } }, children: [heading, ...body] };
        }
        if (name === 'details') {
          const summary = { type: 'paragraph', data: { hName: 'summary' }, children: title ?? [text('More')] };
          const open = node.attributes && 'open' in node.attributes;
          return { type: 'blockquote', data: { hName: 'details', hProperties: { className: ['block', 'block-details'], ...(open ? { open: true } : {}) } }, children: [summary, ...body] };
        }
        // Images on consecutive lines share one paragraph; give each its own figure.
        const figures = body.flatMap((child) => {
          const images = child.type === 'paragraph' ? child.children.filter((c) => c.type === 'image') : [];
          const onlyImages = images.length > 0 && child.children.every((c) => c.type === 'image' || (c.type === 'text' && !c.value.trim()));
          return onlyImages ? images.map((image) => makeFigure({ ...image, title: null }, image.title ? [text(image.title)] : null)) : [child];
        });
        return { type: 'blockquote', data: { hName: 'div', hProperties: { className: ['gallery'] } }, children: figures };
      }

      if (node.type === 'leafDirective') {
        const { src, alt, align, width } = node.attributes;
        return makeFigure({ type: 'image', url: src, alt, title: null }, node.children?.length ? node.children : null, align, width);
      }

      if (isStandaloneImage(node)) {
        const image = node.children[0];
        return makeFigure({ ...image, title: null }, image.title ? [text(image.title)] : null);
      }

      if (Array.isArray(node.children)) node.children = transform(node.children);
      return node;
    });

    tree.children = transform(tree.children);
  };
}
