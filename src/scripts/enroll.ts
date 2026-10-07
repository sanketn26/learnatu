document.querySelectorAll<HTMLButtonElement>('[data-enroll]').forEach((button) => {
  button.addEventListener('click', async () => {
    button.disabled = true;
    const response = await fetch('/api/enroll', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ course: button.dataset.enroll })
    });
    if (response.ok) location.href = button.dataset.first!;
    else { button.disabled = false; alert('Could not enrol. Please try again.'); }
  });
});
