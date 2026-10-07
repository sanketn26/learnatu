import type { Course } from './catalog';

export type Currency = 'INR' | 'USD';

/** Provider and amount (minor units) a course costs in a given currency, or null if it isn't sold in it. */
export function quote(course: Course, currency: Currency) {
  const major = currency === 'INR' ? course.price?.inr : course.price?.usd;
  return major ? { currency, amount: Math.round(major * 100), provider: (currency === 'INR' ? 'razorpay' : 'stripe') as 'razorpay' | 'stripe' } : null;
}
