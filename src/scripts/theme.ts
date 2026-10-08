export {};
/** Theme picker: sets data-theme on <html> and remembers the choice in the `theme` cookie ("system" = no attribute). */
const root = document.documentElement;
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]');

function show(choice: string) {
  buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === choice)));
}

show(root.dataset.theme ?? 'system');
buttons.forEach((button) => button.addEventListener('click', () => {
  const choice = button.dataset.themeChoice!;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = choice;
  document.cookie = `theme=${choice}; path=/; max-age=31536000; samesite=lax`;
  show(choice);
}));
