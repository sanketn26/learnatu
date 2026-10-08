export type Price = { inr?: number; usd?: number };

/** "Free", "₹1,499" or "$9". */
export function formatPrice(price: Price | null, currency: 'inr' | 'usd' = 'inr') {
  const amount = price?.[currency];
  if (!amount) return 'Free';
  return currency === 'inr' ? `₹${amount.toLocaleString('en-IN')}` : `$${amount}`;
}
