import type { APIRoute } from 'astro';
import { json } from '../../lib/http';

export const prerender = false;

/** Lets prerendered pages (the header) find out who is signed in. */
export const GET: APIRoute = async ({ locals }) => {
  const user = await locals.getUser();
  return json({ user: user && { name: user.name, email: user.email, picture: user.picture } });
};
