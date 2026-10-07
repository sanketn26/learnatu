// Prerendered pages can't know who is signed in, so the header asks /api/me and swaps "Sign in" for "My learning".
const link = document.querySelector<HTMLAnchorElement>('#auth-link');
if (link) {
  fetch('/api/me', { credentials: 'same-origin' })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (data?.user) {
        link.textContent = link.dataset.signedIn ?? 'My learning';
        link.href = '/dashboard/';
      }
    })
    .catch(() => {});
}
