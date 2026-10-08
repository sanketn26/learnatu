/**
 * Splits one line of the language into tokens. A line is made of:
 *   words        customer  ingress  database
 *   "strings"    "Orders DB"
 *   operators    ->   <->   <-
 *   a colon      :
 *   key=value    replicas=3   badge="92%"   zones=za,zb
 * A # starts a comment (unless it is inside a string).
 */
export type Token =
  | { type: 'word'; text: string }
  | { type: 'string'; text: string }
  | { type: 'op'; text: '->' | '<->' | '<-' }
  | { type: 'colon' }
  | { type: 'attr'; key: string; value: string };

export interface TokenizeResult { tokens: Token[]; error?: string }

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\r';

export function tokenize(line: string): TokenizeResult {
  const tokens: Token[] = [];
  let i = 0;

  const readString = (): string | null => {
    // line[i] is the opening quote
    let out = '';
    i++;
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
      tokens.push({ type: 'string', text });
      continue;
    }
    if (c === ':') { tokens.push({ type: 'colon' }); i++; continue; }
    if (line.startsWith('<->', i)) { tokens.push({ type: 'op', text: '<->' }); i += 3; continue; }
    if (line.startsWith('->', i)) { tokens.push({ type: 'op', text: '->' }); i += 2; continue; }
    if (line.startsWith('<-', i)) { tokens.push({ type: 'op', text: '<-' }); i += 2; continue; }

    // a word, or key=value
    let word = '';
    while (i < line.length) {
      const d = line[i];
      if (isSpace(d) || d === ':' || d === '#') break;
      if (d === '"') break;
      if (d === '-' && line[i + 1] === '>') break;
      if (d === '<' && line[i + 1] === '-') break;
      word += d;
      i++;
    }
    if (word.endsWith('=') && line[i] === '"') {
      const value = readString();
      if (value === null) return { tokens, error: 'a quote is opened but never closed' };
      tokens.push({ type: 'attr', key: word.slice(0, -1), value });
    } else if (word.includes('=')) {
      const at = word.indexOf('=');
      tokens.push({ type: 'attr', key: word.slice(0, at), value: word.slice(at + 1) });
    } else if (word) {
      tokens.push({ type: 'word', text: word });
    } else {
      return { tokens, error: `unexpected character "${line[i]}"` };
    }
  }
  return { tokens };
}
