import { failOrder, fulfilOrder, refundOrder } from './fulfil';
import { sessionIdForPaymentIntent } from './stripe';

type StripeEvent = { type: string; data?: { object?: { id?: string; payment_status?: string; payment_intent?: string; refunded?: boolean } } };

/** What a verified Stripe webhook means for our orders. Unknown event types are ignored. */
export async function handleStripeEvent(event: StripeEvent) {
  const object = event.data?.object;
  if (!object) return;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      if (object.id && object.payment_status === 'paid') await fulfilOrder('stripe', object.id);
      break;
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      if (object.id) await failOrder('stripe', object.id);
      break;
    case 'charge.refunded': { // `refunded` is true only for a full refund
      const sessionId = object.refunded && object.payment_intent ? await sessionIdForPaymentIntent(object.payment_intent) : null;
      if (sessionId) await refundOrder('stripe', sessionId);
      break;
    }
  }
}

type RazorpayEvent = {
  event: string;
  payload?: { payment?: { entity?: { order_id?: string; amount?: number } }; refund?: { entity?: { amount?: number } } };
};

export async function handleRazorpayEvent(event: RazorpayEvent) {
  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  if (!orderId) return;
  switch (event.event) {
    case 'payment.captured':
    case 'order.paid':
      await fulfilOrder('razorpay', orderId);
      break;
    case 'payment.failed':
      await failOrder('razorpay', orderId);
      break;
    case 'refund.processed': {
      const refunded = event.payload?.refund?.entity?.amount;
      if (typeof refunded === 'number' && typeof payment?.amount === 'number' && refunded >= payment.amount) await refundOrder('razorpay', orderId);
      break;
    }
  }
}
