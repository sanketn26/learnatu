const player = document.querySelector<HTMLElement>('[data-course][data-lesson]');
const toggle = document.querySelector<HTMLButtonElement>('.complete-toggle');

toggle?.addEventListener('click', async () => {
  const complete = toggle.getAttribute('aria-pressed') !== 'true';
  toggle.disabled = true;
  const response = await fetch('/api/progress', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ course: player!.dataset.course, lesson: player!.dataset.lesson, complete })
  });
  toggle.disabled = false;
  if (!response.ok) { console.error('progress save failed', response.status, await response.text()); return; }
  toggle.setAttribute('aria-pressed', String(complete));
  toggle.textContent = complete ? toggle.dataset.done! : toggle.dataset.label!;
  document.querySelector('.player-nav a[aria-current="page"]')?.classList.toggle('done', complete);
});
