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

/** ` Did you mean "mass"?` when one of `choices` is close to `word`, otherwise an empty string. */
export function suggest(word: string, choices: readonly string[]): string {
  let best = '';
  let bestDistance = 3;
  for (const choice of choices) {
    const d = distance(word.toLowerCase(), choice.toLowerCase());
    if (d < bestDistance) { best = choice; bestDistance = d; }
  }
  return best ? ` Did you mean "${best}"?` : '';
}

/** `"a", "b", "c"` */
export const list = (items: readonly string[]) => items.map((i) => `"${i}"`).join(', ');

/** Escapes text for use inside SVG or HTML. */
export const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
