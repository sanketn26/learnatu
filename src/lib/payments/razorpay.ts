import { env } from 'cloudflare:workers';
import { hmacSha256Hex, safeEqual } from '../crypto';
import { logger } from '../log';

const log = logger('payments.razorpay');

export const razorpayConfigured = () => !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
export const razorpayKeyId = () => env.RAZORPAY_KEY_ID!;

export async function createRazorpayOrder(input: { amount: number; receipt: string; notes: Record<string, string> }) {
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}` },
    body: JSON.stringify({ amount: input.amount, currency: 'INR', receipt: input.receipt, notes: input.notes })
  });
  if (!response.ok) {
    log.error('create order failed', undefined, { status: response.status, body: await response.text() });
    throw new Error('Razorpay order creation failed');
  }
  return (await response.json()) as { id: string };
}

/** Checkout callback signature: HMAC-SHA256(order_id|payment_id) with the key secret. */
export async function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  return safeEqual(await hmacSha256Hex(env.RAZORPAY_KEY_SECRET!, `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC-SHA256(raw body) with the webhook secret. */
export async function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  return safeEqual(await hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
}
