/**
 * Finds the fenced code blocks of a Markdown file, the way Markdown itself does: a block opens with three or more
 * backticks and closes with at least as many, so a four-backtick block can show three-backtick blocks inside it
 * (as the authoring tutorial does). Returns the real top-level blocks and the plain text around them (with
 * inline `code` removed), so checks look at what a reader would see rather than at examples inside code.
 */
export function scanMarkdown(body) {
  const blocks = [];
  const prose = [];
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let open = null;
  lines.forEach((line, index) => {
    if (open) {
      const close = line.match(/^\s*(`{3,})\s*$/);
      if (close && close[1].length >= open.fence) { blocks.push({ lang: open.lang, text: open.lines.join('\n'), line: open.line }); open = null; }
      else open.lines.push(line);
      return;
    }
    const start = line.match(/^\s*(`{3,})\s*([^`\s]*)/);
    if (start) { open = { fence: start[1].length, lang: start[2], lines: [], line: index + 1 }; return; }
    prose.push(line.replace(/`[^`\n]*`/g, ''));
  });
  if (open) blocks.push({ lang: open.lang, text: open.lines.join('\n'), line: open.line });
  return { blocks, prose: prose.join('\n') };
}
