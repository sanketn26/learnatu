import type { AstroCookies } from 'astro';
import { localeCodes, type Locale } from '../i18n/locales';
import { pickLang, splitLangPrefix } from './lang-rules';

export const LANG_COOKIE = 'lang';

export const isLocale = (value: unknown): value is Locale => typeof value === 'string' && (localeCodes as readonly string[]).includes(value);

/** The language to show for this request. */
export const detectLang = (cookies: AstroCookies, acceptLanguage: string | null) =>
  pickLang(cookies.get(LANG_COOKIE)?.value, acceptLanguage, localeCodes) as Locale;

/** Old language-prefixed URL (/hi/courses/) -> its language and the unprefixed path, or null. */
export const legacyLangPath = (pathname: string) => splitLangPrefix(pathname, localeCodes) as { lang: Locale; rest: string } | null;

export function setLangCookie(cookies: AstroCookies, lang: Locale) {
  cookies.set(LANG_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}
