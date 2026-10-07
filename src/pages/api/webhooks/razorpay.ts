import type { APIRoute } from 'astro';
import { fulfilOrder } from '../../../lib/payments/fulfil';
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
  const event = JSON.parse(raw) as { event: string; payload?: { payment?: { entity?: { order_id?: string } } } };
  log.debug('event', { type: event.event });
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const orderId = event.payload?.payment?.entity?.order_id;
    if (orderId) await fulfilOrder('razorpay', orderId);
  }
  return new Response('ok');
};
