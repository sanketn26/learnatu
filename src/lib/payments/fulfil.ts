import { enroll } from '../db/enrollments';
import { findOrderByRef, markOrderPaid, type Order } from '../db/orders';
import { logger } from '../log';

const log = logger('payments.fulfil');

/**
 * Marks an order paid and enrols the buyer. Safe to call many times
 * (browser verify + webhook both call it); the second call is a no-op.
 */
export async function fulfilOrder(provider: Order['provider'], providerRef: string) {
  const order = await findOrderByRef(provider, providerRef);
  if (!order) { log.warn('payment for unknown order', { provider, providerRef }); return null; }
  if (order.status !== 'paid') {
    await markOrderPaid(order.id);
    await enroll(order.user_id, order.course, provider);
    log.info('order fulfilled', { orderId: order.id, userId: order.user_id, course: order.course, provider });
  }
  return order;
}
