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

/** Verifies the `Stripe-Signature` header: `t=<unix>,v1=<hmac of "t.body">` (several v1 values appear while a secret is being rotated). */
export async function verifyWebhook(rawBody: string, header: string | null) {
  if (!header || !env.STRIPE_WEBHOOK_SECRET) return false;
  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    const key = part.slice(0, at).trim(), value = part.slice(at + 1).trim();
    if (key === 't') timestamp = Number(value);
    else if (key === 'v1') signatures.push(value);
  }
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
  const expected = await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, `${timestamp}.${rawBody}`);
  return signatures.some((signature) => safeEqual(expected, signature));
}

const stripeGet = async (path: string) => {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (!response.ok) {
    log.error('stripe lookup failed', undefined, { path, status: response.status, body: await response.text() });
    throw new Error('Stripe lookup failed');
  }
  return response.json();
};

/** Asks Stripe for the current state of a Checkout Session (used when the buyer returns, before the webhook may have arrived). */
export const retrieveCheckoutSession = (id: string) =>
  stripeGet(`checkout/sessions/${encodeURIComponent(id)}`) as Promise<{ id: string; payment_status: string; status: string }>;

/** The Checkout Session that took a payment (refund events only know the payment intent). */
export async function sessionIdForPaymentIntent(paymentIntent: string) {
  const list = (await stripeGet(`checkout/sessions?payment_intent=${encodeURIComponent(paymentIntent)}&limit=1`)) as { data: { id: string }[] };
  return list.data[0]?.id ?? null;
}
