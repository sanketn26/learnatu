/**
 * rehype-katex draws a formula it cannot read as red text and only records a warning. A wrong formula should not
 * ship quietly, so this step (placed right after rehype-katex) turns those warnings into an error that names the
 * file, the line and what KaTeX could not read.
 */
export default function rehypeMathErrors() {
  return (_tree, file) => {
    const bad = file.messages.filter((message) => message.source === 'rehype-katex');
    if (!bad.length) return;
    throw new Error(bad.map((message) => `${file.path ?? 'markdown'}: formula on line ${message.line ?? '?'}: ${String(message.cause?.message ?? message.reason).replace(/^KaTeX parse error: /, '')}`).join('\n'));
  };
}
