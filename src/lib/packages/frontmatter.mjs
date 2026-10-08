import { parse } from 'yaml';

/** Splits a Markdown file into its `---` settings block and its body. Throws a readable message on bad input. */
export function splitFrontMatter(text) {
  const match = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('missing settings block (--- lines at the top of the file)');
  let data;
  try { data = parse(match[1]) ?? {}; } catch (error) { throw new Error(`settings are not valid YAML: ${error.message.split('\n')[0]}`); }
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error('settings must be a list of "name: value" lines');
  return { data, body: match[2] };
}
