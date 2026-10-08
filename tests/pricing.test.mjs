import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice } from '../src/lib/courses/format.ts';
import { quote } from '../src/lib/courses/pricing.ts';

test('formatPrice', () => {
  assert.equal(formatPrice(null), 'Free');
  assert.equal(formatPrice({ inr: 499 }), '₹499');
  assert.equal(formatPrice({ inr: 12499 }), '₹12,499');
  assert.equal(formatPrice({ inr: 499, usd: 9 }, 'usd'), '$9');
  assert.equal(formatPrice({ inr: 499 }, 'usd'), 'Free');
});

test('quote converts to minor units and picks the payment provider', () => {
  const course = { price: { inr: 499, usd: 9 } };
  assert.deepEqual(quote(course, 'INR'), { currency: 'INR', amount: 49900, provider: 'razorpay' });
  assert.deepEqual(quote(course, 'USD'), { currency: 'USD', amount: 900, provider: 'stripe' });
});

test('quote is null when the course is not sold in that currency', () => {
  assert.equal(quote({ price: { inr: 499 } }, 'USD'), null);
  assert.equal(quote({ price: null }, 'INR'), null);
});
