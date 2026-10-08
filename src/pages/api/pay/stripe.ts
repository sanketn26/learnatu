import { authedApi, HttpError, json, readJson } from '../../../lib/http';
import { createOrder } from '../../../lib/db/orders';
import { createCheckoutSession, stripeConfigured } from '../../../lib/payments/stripe';
import { prepareCheckout } from '../../../lib/payments/start';

export const prerender = false;

/** POST {course} → creates a Stripe Checkout Session and returns the URL to redirect to. */
export const POST = authedApi(async ({ request }, user) => {
  if (!stripeConfigured()) throw new HttpError(503, 'Stripe is not configured');
  const { course: slug } = await readJson<{ course: string }>(request);
  const { course, amount, siteUrl } = await prepareCheckout(user, slug, 'USD');
  const id = crypto.randomUUID();
  const session = await createCheckoutSession({
    orderId: id, amount, courseTitle: course.title, email: user.email,
    successUrl: `${siteUrl}/courses/${course.slug}/?paid=1&session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${siteUrl}/checkout/${course.slug}/`
  });
  await createOrder({ id, user_id: user.id, course: course.slug, provider: 'stripe', provider_ref: session.id, amount, currency: 'USD' });
  return json({ url: session.url });
});
