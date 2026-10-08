/**
 * Splits one line of the language into tokens. A token is a run of characters without spaces, or a "quoted string",
 * or key="quoted value". A # at the start of a token begins a comment.
 */
export interface Token { text: string; quoted: boolean; key?: string }
export interface TokenizeResult { tokens: Token[]; error?: string }

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\r';

export function tokenize(line: string): TokenizeResult {
  const tokens: Token[] = [];
  let i = 0;

  const readString = (): string | null => {
    let out = '';
    i++; // opening quote
    while (i < line.length) {
      const c = line[i];
      if (c === '\\' && i + 1 < line.length) { out += line[i + 1]; i += 2; continue; }
      if (c === '"') { i++; return out; }
      out += c;
      i++;
    }
    return null;
  };

  while (i < line.length) {
    const c = line[i];
    if (isSpace(c)) { i++; continue; }
    if (c === '#') break;
    if (c === '"') {
      const text = readString();
      if (text === null) return { tokens, error: 'a quote is opened but never closed' };
      tokens.push({ text, quoted: true });
      continue;
    }
    let word = '';
    while (i < line.length && !isSpace(line[i]) && line[i] !== '"') word += line[i++];
    if (/^[A-Za-z_][A-Za-z0-9_]*=$/.test(word) && line[i] === '"') {
      const value = readString();
      if (value === null) return { tokens, error: 'a quote is opened but never closed' };
      tokens.push({ text: value, quoted: true, key: word.slice(0, -1) });
    } else {
      // a quote glued to a word, as in ab"c", is not allowed
      if (line[i] === '"') return { tokens, error: `put a space before the quote after "${word}"` };
      tokens.push({ text: word, quoted: false });
    }
  }
  return { tokens };
}
