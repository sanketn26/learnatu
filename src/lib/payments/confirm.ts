import { findOrderByRef } from '../db/orders';
import type { User } from '../db/users';
import { fulfilOrder } from './fulfil';
import { retrieveCheckoutSession } from './stripe';

/**
 * Stripe sends the buyer back with ?session_id=… possibly before the webhook arrives. Ask Stripe directly
 * and enrol now if it was paid, so the learner never lands on a locked course. Returns true when access was granted.
 */
export async function confirmStripeReturn(user: User, sessionId: string) {
  const order = await findOrderByRef('stripe', sessionId);
  if (!order || order.user_id !== user.id) return false;
  const session = await retrieveCheckoutSession(sessionId);
  if (session.payment_status !== 'paid') return false;
  await fulfilOrder('stripe', sessionId);
  return true;
}
