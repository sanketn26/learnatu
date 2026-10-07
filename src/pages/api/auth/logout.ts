import type { APIRoute } from 'astro';
import { endSession } from '../../../lib/auth/session';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  await endSession(cookies);
  return redirect('/', 303);
};
