const root = document.querySelector<HTMLElement>('.checkout')!;
const course = root.dataset.course!;
const errorBox = document.querySelector<HTMLElement>('#checkout-error')!;

const fail = (message: string) => { errorBox.hidden = false; errorBox.textContent = message; };
async function post(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data;
}

document.querySelector('#pay-stripe')?.addEventListener('click', async () => {
  try { location.href = (await post('/api/pay/stripe', 'POST', { course })).url; } catch (error) { fail((error as Error).message); }
});

document.querySelector('#pay-razorpay')?.addEventListener('click', async () => {
  try {
    const order = await post('/api/pay/razorpay', 'POST', { course });
    await new Promise<void>((resolve, reject) => {
      if ((window as any).Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(); script.onerror = () => reject(new Error('Could not load Razorpay'));
      document.head.append(script);
    });
    const checkout = new (window as any).Razorpay({
      key: order.keyId, order_id: order.orderId, amount: order.amount, currency: 'INR', name: 'Learnatu', description: order.name,
      prefill: { email: order.email },
      handler: async (result: Record<string, string>) => {
        try { await post('/api/pay/razorpay', 'PUT', result); location.href = `/courses/${course}/`; } catch (error) { fail((error as Error).message); }
      }
    });
    checkout.open();
  } catch (error) { fail((error as Error).message); }
});
