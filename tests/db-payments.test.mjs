import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { fakeD1, importWithFakes } from './helpers/d1.mjs';

const env = { STRIPE_WEBHOOK_SECRET: 'whsec', STRIPE_SECRET_KEY: 'sk', RAZORPAY_KEY_SECRET: 'rzp', RAZORPAY_WEBHOOK_SECRET: 'rzpwh' };
const [users, sessions, orders, enrollments, progress, versions, fulfil, events, stripe, razorpay] = await importWithFakes([
  'src/lib/db/users.ts', 'src/lib/db/sessions.ts', 'src/lib/db/orders.ts', 'src/lib/db/enrollments.ts', 'src/lib/db/progress.ts',
  'src/lib/db/course-versions.ts', 'src/lib/payments/fulfil.ts', 'src/lib/payments/events.ts', 'src/lib/payments/stripe.ts', 'src/lib/payments/razorpay.ts'
], env);

let user;
beforeEach(async () => {
  env.DB = fakeD1();
  user = await users.upsertGoogleUser({ sub: 'g1', email: 'a@example.com', name: 'A' });
});

const newOrder = (provider = 'stripe', ref = 'cs_1') =>
  orders.createOrder({ id: `o-${ref}`, user_id: user.id, course: 'demo', provider, provider_ref: ref, amount: 100, currency: 'USD' });

// ---------------------------------------------------------------- users and sessions

test('signing in twice keeps one user and refreshes the profile', async () => {
  const again = await users.upsertGoogleUser({ sub: 'g1', email: 'new@example.com', name: 'B' });
  assert.equal(again.id, user.id);
  const row = await env.DB.prepare('SELECT email, name FROM users WHERE id = ?').bind(user.id).first();
  assert.deepEqual(row, { email: 'new@example.com', name: 'B' });
});

test('sessions expire, are purged, and can all be removed', async () => {
  await sessions.createSession(user.id, 'tok-a');
  assert.equal((await sessions.findUserBySession('tok-a')).id, user.id);
  env.DB.sqlite.exec('UPDATE sessions SET expires_at = 1');
  assert.equal(await sessions.findUserBySession('tok-a'), null);
  await sessions.createSession(user.id, 'tok-b'); // purges the expired one
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions').first()).n, 1);
  await sessions.createSession(user.id, 'tok-c');
  await sessions.deleteUserSessions(user.id);
  assert.equal(await sessions.findUserBySession('tok-b'), null);
  assert.equal(await sessions.findUserBySession('tok-c'), null);
});

// ---------------------------------------------------------------- orders, refunds, events

test('a failed event never downgrades a paid order; a refund removes paid access only', async () => {
  await newOrder();
  await fulfil.fulfilOrder('stripe', 'cs_1');
  await fulfil.failOrder('stripe', 'cs_1');
  assert.equal((await orders.findOrderByRef('stripe', 'cs_1')).status, 'paid');
  await enrollments.enroll(user.id, 'other', 'grant');
  await fulfil.refundOrder('stripe', 'cs_1');
  assert.equal((await orders.findOrderByRef('stripe', 'cs_1')).status, 'refunded');
  assert.equal(await enrollments.isEnrolled(user.id, 'demo'), false);
  assert.equal(await enrollments.isEnrolled(user.id, 'other'), true);
});

test('stripe events: paid, expired, unknown', async () => {
  await newOrder('stripe', 'cs_paid');
  await newOrder('stripe', 'cs_expired');
  await events.handleStripeEvent({ type: 'checkout.session.completed', data: { object: { id: 'cs_paid', payment_status: 'unpaid' } } });
  assert.equal((await orders.findOrderByRef('stripe', 'cs_paid')).status, 'created');
  await events.handleStripeEvent({ type: 'checkout.session.completed', data: { object: { id: 'cs_paid', payment_status: 'paid' } } });
  assert.equal((await orders.findOrderByRef('stripe', 'cs_paid')).status, 'paid');
  await events.handleStripeEvent({ type: 'checkout.session.expired', data: { object: { id: 'cs_expired' } } });
  assert.equal((await orders.findOrderByRef('stripe', 'cs_expired')).status, 'failed');
  await events.handleStripeEvent({ type: 'something.else', data: { object: { id: 'x' } } });
});

test('razorpay events: captured, failed, partial and full refunds', async () => {
  await newOrder('razorpay', 'order_ok');
  await newOrder('razorpay', 'order_bad');
  const payment = (order_id) => ({ entity: { order_id, amount: 500 } });
  await events.handleRazorpayEvent({ event: 'payment.failed', payload: { payment: payment('order_bad') } });
  assert.equal((await orders.findOrderByRef('razorpay', 'order_bad')).status, 'failed');
  await events.handleRazorpayEvent({ event: 'payment.captured', payload: { payment: payment('order_ok') } });
  assert.equal(await enrollments.isEnrolled(user.id, 'demo'), true);
  await events.handleRazorpayEvent({ event: 'refund.processed', payload: { payment: payment('order_ok'), refund: { entity: { amount: 100 } } } });
  assert.equal(await enrollments.isEnrolled(user.id, 'demo'), true); // partial refund keeps access
  await events.handleRazorpayEvent({ event: 'refund.processed', payload: { payment: payment('order_ok'), refund: { entity: { amount: 500 } } } });
  assert.equal(await enrollments.isEnrolled(user.id, 'demo'), false);
});

// ---------------------------------------------------------------- signatures

const stripeHeader = (body, secret = 'whsec', t = Math.floor(Date.now() / 1000)) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

test('stripe webhook signatures: valid, wrong secret, stale, rotated, malformed', async () => {
  const body = '{"a":1}';
  assert.equal(await stripe.verifyWebhook(body, stripeHeader(body)), true);
  assert.equal(await stripe.verifyWebhook(body, stripeHeader(body, 'other')), false);
  assert.equal(await stripe.verifyWebhook(body, stripeHeader(body, 'whsec', Math.floor(Date.now() / 1000) - 3600)), false);
  assert.equal(await stripe.verifyWebhook('{"a":2}', stripeHeader(body)), false);
  assert.equal(await stripe.verifyWebhook(body, `${stripeHeader(body, 'old')},v1=${stripeHeader(body).split('v1=')[1]}`), true); // second v1 matches
  for (const bad of [null, '', 'garbage', 't=abc,v1=zz']) assert.equal(await stripe.verifyWebhook(body, bad), false);
});

test('razorpay signatures', async () => {
  const sign = (secret, text) => createHmac('sha256', secret).update(text).digest('hex');
  assert.equal(await razorpay.verifyCheckoutSignature('o1', 'p1', sign('rzp', 'o1|p1')), true);
  assert.equal(await razorpay.verifyCheckoutSignature('o1', 'p2', sign('rzp', 'o1|p1')), false);
  assert.equal(await razorpay.verifyWebhookSignature('{}', sign('rzpwh', '{}')), true);
  assert.equal(await razorpay.verifyWebhookSignature('{}', 'nope'), false);
});

// ---------------------------------------------------------------- quizzes

test('a passed quiz is stored once, wrong answers are kept, and floods are refused', async () => {
  const attempt = (correct) => progress.recordQuizAttempt(user.id, 'demo', 'l1', 'q1', correct);
  await attempt(false); await attempt(true); await attempt(true);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM quiz_attempts').first()).n, 2);
  assert.deepEqual([...(await progress.passedQuizzes(user.id, 'demo', 'l1'))], ['q1']);
  let refused = 0;
  for (let i = 0; i < 40; i++) if ((await attempt(false)) === false) refused++;
  assert.ok(refused > 0);
});

// ---------------------------------------------------------------- course versions

const upload = (extra = {}) => versions.createDraftVersion({
  course: 'c', userId: user.id, settings: {}, aboutHtml: '', lessons: [{ lang: 'en', slug: 'a', settings: {}, html: '<p>a</p>' }],
  assets: [{ path: 'images/x.png', contentType: 'image/png', data: new Uint8Array([1, 2, 3]) }], ...extra
});

test('uploads become numbered drafts; publishing archives the previous version', async () => {
  const one = await upload(), two = await upload();
  assert.deepEqual([one.version, two.version], [1, 2]);
  assert.equal((await versions.getVersion(one.id)).status, 'draft');
  await versions.publishVersion(one.id);
  await versions.publishVersion(two.id);
  assert.equal((await versions.getVersion(one.id)).status, 'archived');
  assert.equal((await versions.getPublishedVersion('c')).id, two.id);
  assert.equal(await versions.publishVersion(one.id), true); // roll back
  assert.equal((await versions.getPublishedVersion('c')).id, one.id);
  assert.equal((await versions.getAsset(one.id, 'images/x.png')).data.byteLength, 3);
});

test('a failed upload leaves nothing behind, and a half-written one is invisible', async () => {
  await assert.rejects(upload({ lessons: [{ lang: 'en', slug: 'a', settings: {}, html: '' }, { lang: 'en', slug: 'a', settings: {}, html: '' }] }));
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM course_versions').first()).n, 0);
  env.DB.sqlite.exec("INSERT INTO course_versions (id, course, version, status, settings, about_html, uploaded_by, created_at) VALUES ('half','c',9,'uploading','{}','',(SELECT id FROM users),1)");
  assert.equal(await versions.getVersion('half'), null);
  assert.equal(await versions.publishVersion('half'), false);
  assert.equal((await versions.listAllVersions()).length, 0);
});
