/** Pure language rules (no Astro, no cookies) so they are easy to test. `lang.ts` wires them to requests. */

/** Saved choice wins; else the first supported language in an Accept-Language header ("hi-IN,hi;q=0.9"); else English. */
export function pickLang(saved: string | undefined, acceptLanguage: string | null, supported: readonly string[]): string {
  if (saved && supported.includes(saved)) return saved;
  for (const part of (acceptLanguage ?? '').split(',')) {
    const code = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if (supported.includes(code)) return code;
  }
  return 'en';
}

/** "/hi/courses/" -> { lang: "hi", rest: "/courses/" }. Returns null when the path has no language prefix. */
export function splitLangPrefix(pathname: string, supported: readonly string[]): { lang: string; rest: string } | null {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  return match && supported.includes(match[1]) ? { lang: match[1], rest: match[2] ?? '/' } : null;
}
