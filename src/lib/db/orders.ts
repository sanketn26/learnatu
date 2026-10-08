import { db, now } from './client';

export type Order = { id: string; user_id: string; course: string; provider: 'razorpay' | 'stripe'; provider_ref: string; amount: number; currency: string; status: 'created' | 'paid' | 'failed' | 'refunded' };

export async function createOrder(order: Omit<Order, 'status'>) {
  await db().prepare('INSERT INTO orders (id, user_id, course, provider, provider_ref, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(order.id, order.user_id, order.course, order.provider, order.provider_ref, order.amount, order.currency, 'created', now()).run();
}

export const findOrderByRef = (provider: Order['provider'], ref: string) =>
  db().prepare('SELECT * FROM orders WHERE provider = ? AND provider_ref = ?').bind(provider, ref).first<Order>();

export const findOrderById = (id: string) => db().prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Order>();

export async function markOrderPaid(id: string) {
  await db().prepare("UPDATE orders SET status = 'paid' WHERE id = ?").bind(id).run();
}

/** Records a payment that did not complete. A paid order is never downgraded. */
export async function markOrderFailed(id: string) {
  await db().prepare("UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'created'").bind(id).run();
}

export async function markOrderRefunded(id: string) {
  await db().prepare("UPDATE orders SET status = 'refunded' WHERE id = ? AND status = 'paid'").bind(id).run();
}
