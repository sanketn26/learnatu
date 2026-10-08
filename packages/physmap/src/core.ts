import type { Dim, Param, Predict, Problem, Val, Vec } from './types.ts';
import { tokenize } from './tokenize.ts';
import type { Token } from './tokenize.ts';
import { NO_DIM, dimName, dimSymbol, isNone, parseQuantity, sameDim } from './units.ts';

/**
 * What every scene's parser shares: reading numbers with units, sliders, `key=value` properties, and the lines that
 * mean the same in every scene (title, assume, param, predict). Mistakes are collected with their line numbers.
 */
export interface Statement { line: number; command: string; rest: Token[] }
export interface Args { words: string[]; props: Map<string, { text: string }> }

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = keep;
    }
  }
  return row[b.length];
}

/** ` Did you mean "mass"?` when one of `choices` is close to `word`. */
export function suggest(word: string, choices: readonly string[]): string {
  let best = '';
  let bestDistance = 3;
  for (const choice of choices) {
    const d = distance(word.toLowerCase(), choice.toLowerCase());
    if (d < bestDistance) { best = choice; bestDistance = d; }
  }
  return best ? ` Did you mean "${best}"?` : '';
}

export const list = (items: readonly string[]) => items.map((i) => `"${i}"`).join(', ');

/** Spaces inside (...) are dropped, so "(0m, 1m)" is one word. Quoted text is left alone. */
export function tightenParens(line: string): string {
  let out = '';
  let depth = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && quoted) { out += c + (line[++i] ?? ''); continue; }
    if (c === '"') quoted = !quoted;
    if (!quoted && c === '(') depth++;
    if (!quoted && c === ')') depth = Math.max(0, depth - 1);
    if (depth > 0 && !quoted && (c === ' ' || c === '\t')) continue;
    out += c;
  }
  return out;
}

/** Splits the text into statements (blank lines and comments dropped). Quote mistakes become problems. */
export function statements(source: string, problems: Problem[]): Statement[] {
  const out: Statement[] = [];
  source.split('\n').forEach((raw, i) => {
    const { tokens, error } = tokenize(tightenParens(raw));
    if (error) { problems.push({ line: i + 1, message: error }); return; }
    if (tokens.length) out.push({ line: i + 1, command: tokens[0].text, rest: tokens.slice(1) });
  });
  return out;
}

export interface Ctx {
  problems: Problem[];
  params: Map<string, Param>;
  predicts: Predict[];
  assumptions: string[];
  images: { line: number; ref: string }[];
  title?: string;
  problem(line: number, message: string): void;
  /** A number with a unit in `dim`, or `$slider`. Records a problem and returns null when it is not. */
  value(text: string, dim: Dim, what: string, line: number, needUnit?: boolean): Val | null;
  /** The same, for a number that cannot be a slider. */
  fixed(text: string, dim: Dim, what: string, line: number, needUnit?: boolean): number | null;
  vector(text: string, dim: Dim, what: string, line: number): Vec | null;
  args(tokens: Token[], keys: string[], line: number, command: string): Args;
  /** Handles title, assume, param and predict. Returns false for any other command. */
  common(s: Statement): boolean;
}

export function makeCtx(): Ctx {
  const problems: Problem[] = [];
  const problem = (line: number, message: string) => { problems.push({ line, message }); };
  const ctx: Ctx = {
    problems, params: new Map(), predicts: [], assumptions: [], images: [], problem,
    value(text, dim, what, line, needUnit = false) {
      if (text.startsWith('$')) {
        const p = ctx.params.get(text.slice(1));
        if (!p) { problem(line, `there is no slider called "${text.slice(1)}"; add a "param" line for it first.${suggest(text.slice(1), [...ctx.params.keys()])}`); return null; }
        if (!sameDim(p.dim, dim)) { problem(line, `${what} needs ${dimName(dim)}, but the slider "${p.name}" is ${dimName(p.dim)} (${p.unit || 'no unit'})`); return null; }
        return { param: p.name };
      }
      const q = parseQuantity(text);
      if (typeof q === 'string') { problem(line, `${what}: ${q}`); return null; }
      if (!sameDim(q.dim, dim)) {
        if (isNone(q.dim)) problem(line, `${what} needs ${dimName(dim)}, so write a unit, for example ${text}${dimSymbol(dim)}`);
        else problem(line, `${what} needs ${dimName(dim)}, but "${text}" is ${dimName(q.dim)}`);
        return null;
      }
      if (needUnit && !q.unit) { problem(line, `${what} needs a unit: deg or rad (for example ${text}deg)`); return null; }
      return q.value;
    },
    fixed(text, dim, what, line, needUnit = false) {
      const v = ctx.value(text, dim, what, line, needUnit);
      if (v === null) return null;
      if (typeof v === 'object') { problem(line, `${what} cannot be a slider here`); return null; }
      return v;
    },
    vector(text, dim, what, line) {
      const match = /^\((.*)\)$/.exec(text);
      const parts = match ? match[1].split(',') : [];
      if (parts.length !== 2) { problem(line, `${what} needs two numbers in brackets, like (2m,1m); you wrote "${text}"`); return null; }
      const x = ctx.value(parts[0].trim(), dim, `${what} (first number)`, line);
      const y = ctx.value(parts[1].trim(), dim, `${what} (second number)`, line);
      return x === null || y === null ? null : [x, y];
    },
    args(tokens, keys, line, command) {
      const out: Args = { words: [], props: new Map() };
      for (const t of tokens) {
        let key = t.key;
        let text = t.text;
        if (!key && !t.quoted) {
          const eq = t.text.indexOf('=');
          if (eq > 0 && /^[A-Za-z_]\w*$/.test(t.text.slice(0, eq))) { key = t.text.slice(0, eq); text = t.text.slice(eq + 1); }
        }
        if (key === undefined) { out.words.push(t.text); continue; }
        if (!keys.includes(key)) { problem(line, `"${command}" has no property "${key}".${suggest(key, keys)} It can have: ${list(keys)}`); continue; }
        if (out.props.has(key)) { problem(line, `"${key}" is written twice`); continue; }
        out.props.set(key, { text });
      }
      return out;
    },
    common({ line, command, rest }) {
      switch (command) {
        case 'title':
          if (!rest[0]?.quoted) problem(line, 'title needs the text in quotes: title "Mass on a spring"');
          else ctx.title = rest[0].text;
          return true;
        case 'assume':
          if (!rest[0]?.quoted) problem(line, 'assume needs the text in quotes: assume "no air resistance"');
          else ctx.assumptions.push(rest[0].text);
          return true;
        case 'predict': {
          const a = ctx.args(rest, ['answer'], line, 'predict');
          if (!a.words[0] || !rest.find((t) => t.quoted && !t.key)) { problem(line, 'predict needs a question in quotes and answer="…": predict "What happens if the mass doubles?" answer="The swing takes about 41% longer."'); return true; }
          const answer = a.props.get('answer')?.text;
          if (!answer) { problem(line, 'predict needs answer="…"'); return true; }
          ctx.predicts.push({ line, question: a.words[0], answer });
          return true;
        }
        case 'param': {
          const a = ctx.args(rest, ['start', 'label'], line, 'param');
          const [name, span, unitText = ''] = a.words;
          if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) { problem(line, 'param needs a name: param k 10..100 N/m start=40'); return true; }
          if (ctx.params.has(name)) { problem(line, `the slider "${name}" is already defined`); return true; }
          const range = span ? /^(.+?)\.\.(.+)$/.exec(span) : null;
          const lo = range ? Number(range[1]) : NaN;
          const hi = range ? Number(range[2]) : NaN;
          if (!range || !Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) { problem(line, `param "${name}" needs a range from smaller to bigger, like 10..100`); return true; }
          const unit = parseQuantity(`1${unitText}`);
          if (typeof unit === 'string') { problem(line, `param "${name}": ${unit}`); return true; }
          const start = a.props.has('start') ? Number(a.props.get('start')?.text) : lo;
          if (!Number.isFinite(start) || start < lo || start > hi) { problem(line, `start for "${name}" must be a number from ${lo} to ${hi}`); return true; }
          ctx.params.set(name, { name, line, min: lo * unit.value, max: hi * unit.value, start: start * unit.value, dim: unit.dim, unit: unitText, factor: unit.value, label: a.props.get('label')?.text ?? name });
          return true;
        }
        default:
          return false;
      }
    }
  };
  return ctx;
}

/** Reads a value: a plain number, or a slider's current setting. */
export const val = (v: Val, values: Record<string, number>): number => (typeof v === 'number' ? v : values[v.param]);
export const NONE: Dim = NO_DIM;
