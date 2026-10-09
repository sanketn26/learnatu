import { list, suggest, tokenize } from '@learnatu/textmap-core';
import { LIMITS, TsrunSyntaxError } from './types.ts';
import type { Block, Problem } from './types.ts';

/**
 * Reads the text of a ```tsrun block. Lines at the very top that start with `//@` are options for the block; they
 * stop at the first line that is anything else, and what follows is the TypeScript the reader sees.
 *
 *   //@ title "Narrowing"
 *   //@ timeout 5
 *   //@ typecheck off
 *   //@ strict off
 *   //@ readonly
 *   //@ mode render      (then `render(html)` and `canvas` are available)
 *   //@ size 600 300
 *   const n: number = 3;
 *   console.log(n * 2);
 *
 * `parseTsrun` never throws. `parse` throws a TsrunSyntaxError. `check` returns just the problems.
 */
const OPTIONS = ['title', 'timeout', 'typecheck', 'strict', 'readonly', 'mode', 'size'];

export interface ParseResult { block: Block | null; problems: Problem[] }

export function parseTsrun(source: string): ParseResult {
  const problems: Problem[] = [];
  const fail = (line: number, message: string) => { problems.push({ line, message }); };
  const block: Block = { code: '', timeout: LIMITS.timeout.default, readonly: false, typecheck: true, strict: true, mode: 'run', size: { ...LIMITS.size.default } };
  const seen = new Set<string>();

  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let first = 0;
  while (first < lines.length && /^\s*\/\/@/.test(lines[first])) {
    const line = first + 1;
    const { tokens, error } = tokenize(lines[first].replace(/^\s*\/\/@/, ''));
    first++;
    if (error) { fail(line, error); continue; }
    if (!tokens.length || tokens[0].quoted || tokens[0].key) { fail(line, 'an option line looks like: //@ timeout 5'); continue; }
    const name = tokens[0].text;
    const rest = tokens.slice(1);
    if (!OPTIONS.includes(name)) { fail(line, `"${name}" is not an option.${suggest(name, OPTIONS)} Options: ${list(OPTIONS)}`); continue; }
    if (seen.has(name)) { fail(line, `"${name}" is written twice`); continue; }
    seen.add(name);
    switch (name) {
      case 'title':
        if (rest.length !== 1 || !rest[0].quoted) fail(line, 'title needs the text in quotes: //@ title "Narrowing"');
        else block.title = rest[0].text;
        break;
      case 'timeout': {
        const n = Number(rest[0]?.text);
        if (rest.length !== 1 || !Number.isFinite(n) || n < LIMITS.timeout.min || n > LIMITS.timeout.max) fail(line, `timeout is a number of seconds from ${LIMITS.timeout.min} to ${LIMITS.timeout.max}: //@ timeout 5`);
        else block.timeout = n;
        break;
      }
      case 'typecheck':
      case 'strict': {
        const word = rest[0]?.text;
        if (rest.length !== 1 || (word !== 'on' && word !== 'off')) fail(line, `${name} is on or off: //@ ${name} off`);
        else block[name] = word === 'on';
        break;
      }
      case 'mode': {
        const word = rest[0]?.text;
        if (rest.length !== 1 || (word !== 'run' && word !== 'render')) fail(line, 'mode is run or render: //@ mode render');
        else block.mode = word;
        break;
      }
      case 'size': {
        const [w, h] = [Number(rest[0]?.text), Number(rest[1]?.text)];
        const { min, max } = LIMITS.size;
        if (rest.length !== 2 || !Number.isInteger(w) || !Number.isInteger(h) || w < min || h < min || w > max || h > max) fail(line, `size is the width and height in pixels, each from ${min} to ${max}: //@ size 600 300`);
        else block.size = { width: w, height: h };
        break;
      }
      case 'readonly':
        if (rest.length) fail(line, 'readonly takes nothing after it');
        else block.readonly = true;
        break;
    }
  }
  if (seen.has('size') && block.mode !== 'render') fail(1, 'size is only for mode render: add //@ mode render');
  if (seen.has('strict') && !block.typecheck) fail(1, 'strict does nothing while typecheck is off');

  block.code = lines.slice(first).join('\n').replace(/^\n+/, '').replace(/\s+$/, '');
  if (!block.code.trim()) fail(Math.max(1, first + 1), 'there is no TypeScript in this block. Write the code under the option lines.');
  if (block.code.length > LIMITS.code) fail(first + 1, `the code is longer than ${LIMITS.code} characters; split it into smaller blocks`);
  return { block: problems.length ? null : block, problems };
}

export function parse(source: string): Block {
  const { block, problems } = parseTsrun(source);
  if (!block) throw new TsrunSyntaxError(problems);
  return block;
}

/** Mistakes in the block: [] when fine, otherwise [{ line, message }]. */
export const check = (source: string): Problem[] => parseTsrun(source).problems;
