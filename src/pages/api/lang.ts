import type { APIRoute } from 'astro';
import { isLocale, setLangCookie } from '../../lib/lang';

export const prerender = false;

/** Language switcher: `/api/lang?set=hi&next=/courses/` remembers the choice and returns to the page. */
export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const set = url.searchParams.get('set');
  if (isLocale(set)) setLangCookie(cookies, set);
  const next = url.searchParams.get('next');
  return redirect(next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/', 303);
};
