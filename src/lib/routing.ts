import { localeCodes, type Locale } from '../i18n/locales';

/** `[lang]` route param → a valid Locale (never 'en', which has no prefix), or null for a 404. */
export function localeParam(value: string | undefined): Locale | null {
  return value && value !== 'en' && (localeCodes as readonly string[]).includes(value) ? (value as Locale) : null;
}

export const notFound = () => new Response('Not found', { status: 404 });
