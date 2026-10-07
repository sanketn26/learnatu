/** Upgrades highlighted code: language label, copy button, and tab switching for `.code-tabs` groups. */
const LABELS: Record<string, string> = { js: 'JavaScript', ts: 'TypeScript', py: 'Python', python: 'Python', bash: 'Bash', sh: 'Shell', shell: 'Shell', sql: 'SQL', go: 'Go', html: 'HTML', css: 'CSS', json: 'JSON', yaml: 'YAML', yml: 'YAML', md: 'Markdown', java: 'Java', rust: 'Rust', rs: 'Rust', cs: 'C#', cpp: 'C++', c: 'C', php: 'PHP', rb: 'Ruby', text: 'Text', txt: 'Text' };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function decorate(pre: HTMLElement) {
  if (pre.parentElement?.classList.contains('code-block')) return;
  const language = pre.dataset.language ?? 'text';
  const wrapper = el('div', 'code-block');
  const bar = el('div', 'code-bar');
  const copy = el('button', 'code-copy', 'Copy');
  copy.type = 'button';
  copy.setAttribute('aria-label', `Copy ${LABELS[language] ?? language} code`);
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.textContent ?? ''); copy.textContent = 'Copied ✓'; }
    catch { copy.textContent = 'Press Ctrl+C'; }
    setTimeout(() => (copy.textContent = 'Copy'), 1800);
  });
  bar.append(el('span', 'code-lang', LABELS[language] ?? language), copy);
  pre.replaceWith(wrapper);
  wrapper.append(bar, pre);
}

function buildTabs(group: HTMLElement) {
  const panels = [...group.querySelectorAll<HTMLElement>(':scope > .code-tab')];
  const list = el('div', 'code-tab-list');
  list.setAttribute('role', 'tablist');
  const buttons = panels.map((panel, index) => {
    const button = el('button', 'code-tab-button', panel.dataset.tab);
    button.type = 'button'; button.setAttribute('role', 'tab');
    button.addEventListener('click', () => select(index));
    list.append(button);
    return button;
  });
  const select = (active: number) => panels.forEach((panel, i) => {
    panel.hidden = i !== active;
    buttons[i].setAttribute('aria-selected', String(i === active));
  });
  group.prepend(list);
  select(0);
}

document.querySelectorAll<HTMLElement>('.code-tabs').forEach(buildTabs);
document.querySelectorAll<HTMLElement>('.article pre.astro-code').forEach(decorate);
