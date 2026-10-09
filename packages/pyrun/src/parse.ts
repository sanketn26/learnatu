import { list, suggest, tokenize } from '@learnatu/textmap-core';
import { LIMITS, PACKAGES, PyrunSyntaxError } from './types.ts';
import type { Block, Problem } from './types.ts';

/**
 * Reads the text of a ```pyrun block. Lines at the very top that start with `#@` are options for the block; they
 * stop at the first line that is anything else, and what follows is the Python the reader sees.
 *
 *   #@ title "Squares"
 *   #@ timeout 5
 *   #@ packages numpy
 *   #@ stdin "Asha" "42"
 *   #@ readonly
 *   #@ shared
 *   for n in range(5): print(n * n)
 *
 * `parsePyrun` never throws. `parse` throws a PyrunSyntaxError. `check` returns just the problems.
 */
const OPTIONS = ['title', 'timeout', 'packages', 'stdin', 'readonly', 'shared'];

export interface ParseResult { block: Block | null; problems: Problem[] }

export function parsePyrun(source: string): ParseResult {
  const problems: Problem[] = [];
  const fail = (line: number, message: string) => { problems.push({ line, message }); };
  const block: Block = { code: '', timeout: LIMITS.timeout.default, packages: [], stdin: [], readonly: false, shared: false };
  const seen = new Set<string>();

  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let first = 0;
  while (first < lines.length && /^\s*#@/.test(lines[first])) {
    const line = first + 1;
    const { tokens, error } = tokenize(lines[first].replace(/^\s*#@/, ''));
    first++;
    if (error) { fail(line, error); continue; }
    if (!tokens.length || tokens[0].quoted || tokens[0].key) { fail(line, 'an option line looks like: #@ timeout 5'); continue; }
    const name = tokens[0].text;
    const rest = tokens.slice(1);
    if (!OPTIONS.includes(name)) { fail(line, `"${name}" is not an option.${suggest(name, OPTIONS)} Options: ${list(OPTIONS)}`); continue; }
    if (seen.has(name)) { fail(line, `"${name}" is written twice`); continue; }
    seen.add(name);
    switch (name) {
      case 'title':
        if (rest.length !== 1 || !rest[0].quoted) fail(line, 'title needs the text in quotes: #@ title "Squares"');
        else block.title = rest[0].text;
        break;
      case 'timeout': {
        const n = Number(rest[0]?.text);
        if (rest.length !== 1 || !Number.isFinite(n) || n < LIMITS.timeout.min || n > LIMITS.timeout.max) fail(line, `timeout is a number of seconds from ${LIMITS.timeout.min} to ${LIMITS.timeout.max}: #@ timeout 5`);
        else block.timeout = n;
        break;
      }
      case 'packages': {
        if (!rest.length) { fail(line, `packages needs at least one name: #@ packages numpy. Available: ${list(PACKAGES)}`); break; }
        for (const t of rest) {
          if (!(PACKAGES as readonly string[]).includes(t.text)) fail(line, `"${t.text}" is not available here.${suggest(t.text, PACKAGES)} Available: ${list(PACKAGES)}`);
          else if (!block.packages.includes(t.text)) block.packages.push(t.text);
        }
        break;
      }
      case 'stdin':
        if (!rest.length || rest.some((t) => !t.quoted)) fail(line, 'stdin needs each line of input in quotes: #@ stdin "Asha" "42"');
        else if (rest.length > LIMITS.stdinLines) fail(line, `stdin can hold at most ${LIMITS.stdinLines} lines`);
        else block.stdin = rest.map((t) => t.text);
        break;
      case 'readonly':
      case 'shared':
        if (rest.length) fail(line, `${name} takes nothing after it`);
        else block[name] = true;
        break;
    }
  }

  block.code = lines.slice(first).join('\n').replace(/^\n+/, '').replace(/\s+$/, '');
  if (!block.code.trim()) fail(Math.max(1, first + 1), 'there is no Python in this block. Write the code under the option lines.');
  if (block.code.length > LIMITS.code) fail(first + 1, `the code is longer than ${LIMITS.code} characters; split it into smaller blocks`);
  return { block: problems.length ? null : block, problems };
}

export function parse(source: string): Block {
  const { block, problems } = parsePyrun(source);
  if (!block) throw new PyrunSyntaxError(problems);
  return block;
}

/** Mistakes in the block: [] when fine, otherwise [{ line, message }]. */
export const check = (source: string): Problem[] => parsePyrun(source).problems;
