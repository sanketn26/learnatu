/** Simple site search: every word you type must appear somewhere; title matches rank first. Pure, tested in tests/search.test.mjs. */
export type SearchItem = { title: string; href: string; kind: string; summary?: string; keywords?: string };

const norm = (text: string | undefined) => (text ?? '').toLowerCase();

export function searchItems(items: SearchItem[], query: string, limit = 30): SearchItem[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of items) {
    const title = norm(item.title);
    const rest = `${norm(item.summary)} ${norm(item.keywords)}`;
    let score = 0;
    let matchesAll = true;
    for (const word of words) {
      if (title.includes(word)) score += title.startsWith(word) ? 5 : 3;
      else if (rest.includes(word)) score += 1;
      else { matchesAll = false; break; }
    }
    if (matchesAll) scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title)).slice(0, limit).map((entry) => entry.item);
}
