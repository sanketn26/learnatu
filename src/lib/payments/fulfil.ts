import { enroll, revokePaidEnrollment } from '../db/enrollments';
import { findOrderByRef, markOrderFailed, markOrderPaid, markOrderRefunded, type Order } from '../db/orders';
import { logger } from '../log';

const log = logger('payments.fulfil');

/**
 * Marks an order paid and enrols the buyer. Safe to call many times
 * (browser verify + webhook both call it); enrollment is retried idempotently.
 */
export async function fulfilOrder(provider: Order['provider'], providerRef: string) {
  const order = await findOrderByRef(provider, providerRef);
  if (!order) { log.warn('payment for unknown order', { provider, providerRef }); return null; }
  // Enrollment is idempotent. Retry it even for paid orders to repair partial
  // fulfilments, and only mark paid after access has been granted.
  await enroll(order.user_id, order.course, provider);
  if (order.status !== 'paid') {
    await markOrderPaid(order.id);
    log.info('order fulfilled', { orderId: order.id, userId: order.user_id, course: order.course, provider });
  }
  return order;
}

/** The payment did not go through (expired checkout, declined card). A paid order is left alone. */
export async function failOrder(provider: Order['provider'], providerRef: string) {
  const order = await findOrderByRef(provider, providerRef);
  if (!order) return null;
  await markOrderFailed(order.id);
  log.info('order failed', { orderId: order.id, provider });
  return order;
}

/** The payment was refunded in full: close the order and take the access it bought away. */
export async function refundOrder(provider: Order['provider'], providerRef: string) {
  const order = await findOrderByRef(provider, providerRef);
  if (!order || order.status !== 'paid') return null;
  await markOrderRefunded(order.id);
  await revokePaidEnrollment(order.user_id, order.course, provider);
  log.info('order refunded, access removed', { orderId: order.id, userId: order.user_id, course: order.course, provider });
  return order;
}
