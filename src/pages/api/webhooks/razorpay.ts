import type { APIRoute } from 'astro';
import { handleRazorpayEvent } from '../../../lib/payments/events';
import { verifyWebhookSignature } from '../../../lib/payments/razorpay';
import { logger } from '../../../lib/log';

export const prerender = false;
const log = logger('webhook.razorpay');

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  if (!(await verifyWebhookSignature(raw, request.headers.get('x-razorpay-signature') ?? ''))) {
    log.warn('bad signature');
    return new Response('bad signature', { status: 400 });
  }
  let event;
  try { event = JSON.parse(raw); } catch { return new Response('bad body', { status: 400 }); }
  log.debug('event', { type: event.event });
  await handleRazorpayEvent(event);
  return new Response('ok');
};
