export {};
/** Upload page: sends the zip, shows the check report, and handles Publish / Roll back / Delete. */
const form = document.querySelector<HTMLFormElement>('#upload-form')!;
const report = document.querySelector<HTMLElement>('#report')!;

type Problem = { where: string; message: string };
type UploadResult = { ok: boolean; errors?: Problem[]; warnings?: Problem[]; course?: string; version?: number; versionId?: string; error?: string };

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const list = (items: Problem[], sign: string, kind: string) =>
  items.map((p) => `<li class="${kind}"><b>${sign}</b> <code>${escapeHtml(p.where)}</code> ${escapeHtml(p.message)}</li>`).join('');

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return response.ok;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button')!;
  button.disabled = true;
  report.innerHTML = '<p class="notice">Checking your zip…</p>';
  try {
    const response = await fetch('/api/author/upload', { method: 'POST', body: new FormData(form) });
    const result: UploadResult = await response.json();
    const warnings = list(result.warnings ?? [], '!', 'warn');
    if (result.error) {
      report.innerHTML = `<p class="notice">${escapeHtml(result.error)}</p>`;
    } else if (!result.ok) {
      report.innerHTML = `<div class="notice"><strong>Not saved. Fix these and upload again:</strong></div><ul class="report">${list(result.errors ?? [], '✗', 'bad')}${warnings}</ul>`;
    } else {
      report.innerHTML = `<div class="notice notice-ok"><strong>Saved as draft: ${escapeHtml(result.course!)} v${result.version}.</strong> Nothing is live yet.
        <p class="row-actions"><a class="btn" href="/api/author/preview?course=${encodeURIComponent(result.course!)}&version=${result.versionId}">Preview it</a>
        <button class="btn btn-secondary" type="button" data-version-action="publish" data-version="${result.versionId}">Publish now</button></p></div>
        ${warnings ? `<ul class="report">${warnings}</ul>` : ''}`;
    }
  } catch {
    report.innerHTML = '<p class="notice">Upload failed. Check your connection and try again.</p>';
  } finally {
    button.disabled = false;
  }
});

document.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-version-action]');
  if (!button) return;
  const action = button.dataset.versionAction;
  if (action === 'delete' && !window.confirm('Delete this draft?')) return;
  if (action === 'publish' && !window.confirm('Publish this version? Learners will see it straight away.')) return;
  button.disabled = true;
  if (await postJson('/api/author/versions', { action, versionId: button.dataset.version })) location.reload();
  else { button.disabled = false; report.innerHTML = '<p class="notice">That did not work. Please try again.</p>'; }
});
