import type { APIRoute } from 'astro';
import { handleStripeEvent } from '../../../lib/payments/events';
import { verifyWebhook } from '../../../lib/payments/stripe';
import { logger } from '../../../lib/log';

export const prerender = false;
const log = logger('webhook.stripe');

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  if (!(await verifyWebhook(raw, request.headers.get('stripe-signature')))) {
    log.warn('bad signature');
    return new Response('bad signature', { status: 400 });
  }
  let event;
  try { event = JSON.parse(raw); } catch { return new Response('bad body', { status: 400 }); }
  log.debug('event', { type: event.type });
  await handleStripeEvent(event);
  return new Response('ok');
};
