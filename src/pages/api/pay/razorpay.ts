import { authedApi, HttpError, json, readJson } from '../../../lib/http';
import { createOrder, findOrderByRef } from '../../../lib/db/orders';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId, verifyCheckoutSignature } from '../../../lib/payments/razorpay';
import { fulfilOrder } from '../../../lib/payments/fulfil';
import { prepareCheckout } from '../../../lib/payments/start';

export const prerender = false;

/** POST {course} → creates a Razorpay order for the Checkout widget. */
export const POST = authedApi(async ({ request }, user) => {
  if (!razorpayConfigured()) throw new HttpError(503, 'Razorpay is not configured');
  const { course: slug } = await readJson<{ course: string }>(request);
  const { course, amount } = await prepareCheckout(user, slug, 'INR');
  const id = crypto.randomUUID();
  const remote = await createRazorpayOrder({ amount, receipt: id.slice(0, 40), notes: { orderId: id, userId: user.id, course: course.slug } });
  await createOrder({ id, user_id: user.id, course: course.slug, provider: 'razorpay', provider_ref: remote.id, amount, currency: 'INR' });
  return json({ keyId: razorpayKeyId(), orderId: remote.id, amount, name: course.title, email: user.email });
});

/** PUT {razorpay_order_id, razorpay_payment_id, razorpay_signature} → verifies the Checkout callback and enrols. */
export const PUT = authedApi(async ({ request }, user) => {
  const body = await readJson<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>(request);
  const order = await findOrderByRef('razorpay', body.razorpay_order_id ?? '');
  if (!order || order.user_id !== user.id) throw new HttpError(404, 'Unknown order');
  if (!(await verifyCheckoutSignature(body.razorpay_order_id, body.razorpay_payment_id ?? '', body.razorpay_signature ?? ''))) {
    throw new HttpError(400, 'Payment signature mismatch');
  }
  await fulfilOrder('razorpay', body.razorpay_order_id);
  return json({ ok: true, course: order.course });
});
