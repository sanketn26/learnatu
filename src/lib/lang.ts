import type { AstroCookies } from 'astro';
import { localeCodes, type Locale } from '../i18n/locales';

export const LANG_COOKIE = 'lang';

export const isLocale = (value: unknown): value is Locale => typeof value === 'string' && (localeCodes as readonly string[]).includes(value);

/** The language to show: an explicit `lang` cookie, else the first supported language in the browser's Accept-Language, else English. */
export function detectLang(cookies: AstroCookies, acceptLanguage: string | null): Locale {
  const saved = cookies.get(LANG_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  for (const part of (acceptLanguage ?? '').split(',')) {
    const code = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if (isLocale(code)) return code;
  }
  return 'en';
}

export function setLangCookie(cookies: AstroCookies, lang: Locale) {
  cookies.set(LANG_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}
