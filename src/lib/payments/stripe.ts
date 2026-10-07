import { env } from 'cloudflare:workers';
import { hmacSha256Hex, safeEqual } from '../crypto';
import { logger } from '../log';

const log = logger('payments.stripe');
const TOLERANCE_SECONDS = 300;

export const stripeConfigured = () => !!env.STRIPE_SECRET_KEY;

/** Creates a hosted Checkout Session (no SDK — Stripe's REST API takes form-encoded bodies). */
export async function createCheckoutSession(input: {
  orderId: string; amount: number; courseTitle: string; email: string; successUrl: string; cancelUrl: string;
}) {
  const form = new URLSearchParams({
    mode: 'payment',
    client_reference_id: input.orderId,
    customer_email: input.email,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(input.amount),
    'line_items[0][price_data][product_data][name]': input.courseTitle
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: form
  });
  if (!response.ok) {
    log.error('create session failed', undefined, { status: response.status, body: await response.text() });
    throw new Error('Stripe session creation failed');
  }
  return (await response.json()) as { id: string; url: string };
}

/** Verifies the `Stripe-Signature` header: `t=<unix>,v1=<hmac of "t.body">`. */
export async function verifyWebhook(rawBody: string, header: string | null) {
  if (!header || !env.STRIPE_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
  return safeEqual(await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, `${timestamp}.${rawBody}`), parts.v1 ?? '');
}
