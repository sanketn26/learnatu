import type { APIRoute } from 'astro';
import { fulfilOrder } from '../../../lib/payments/fulfil';
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
  const event = JSON.parse(raw) as { type: string; data: { object: { id: string; payment_status?: string } } };
  log.debug('event', { type: event.type });
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && event.data.object.payment_status === 'paid') {
    await fulfilOrder('stripe', event.data.object.id);
  }
  return new Response('ok');
};
