export {};
/**
 * Display menu: theme and text size. Choices are written to <html> (data-theme / data-size) and remembered
 * in cookies (`theme`, `size`); a tiny inline script in BaseLayout re-applies them before the page paints.
 */
const root = document.documentElement;
const year = 60 * 60 * 24 * 365;
const remember = (name: string, value: string) => { document.cookie = `${name}=${value}; path=/; max-age=${year}; samesite=lax`; };

function markPressed(selector: string, attribute: string, current: string) {
  document.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => button.setAttribute('aria-pressed', String(button.dataset[attribute] === current)));
}

markPressed('[data-theme-choice]', 'themeChoice', root.dataset.theme ?? 'system');
markPressed('[data-size-choice]', 'sizeChoice', root.dataset.size ?? '1');

document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => {
  const choice = button.dataset.themeChoice!;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = choice;
  remember('theme', choice);
  markPressed('[data-theme-choice]', 'themeChoice', choice);
}));

document.querySelectorAll<HTMLButtonElement>('[data-size-choice]').forEach((button) => button.addEventListener('click', () => {
  const choice = button.dataset.sizeChoice!;
  if (choice === '1') root.removeAttribute('data-size');
  else root.dataset.size = choice;
  remember('size', choice);
  markPressed('[data-size-choice]', 'sizeChoice', choice);
}));
