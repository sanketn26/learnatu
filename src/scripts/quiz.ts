import { grade, type Quiz, type Response } from '../lib/quiz-grade';

/** Upgrades each server-rendered `.quiz[data-quiz]` block into an interactive question. */
const player = document.querySelector<HTMLElement>('[data-course][data-lesson]');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function report(quiz: Quiz, correct: boolean) {
  if (!player) return;
  fetch('/api/quiz', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ course: player.dataset.course, lesson: player.dataset.lesson, quiz: quiz.id, correct })
  }).catch(() => {});
}

function build(quiz: Quiz): { body: HTMLElement; read: () => Response | null; lock: (correct: boolean) => void } {
  const body = el('div');
  if (quiz.type === 'fill') {
    const input = el('input');
    input.type = 'text'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Your answer');
    body.append(input);
    return { body, read: () => input.value.trim() || null, lock: () => { input.disabled = true; } };
  }

  if (quiz.type === 'order') {
    // Show the items shuffled; the learner reorders with ↑ ↓.
    let order = quiz.options.map((_, i) => i).sort(() => Math.random() - 0.5);
    const list = el('ol', 'quiz-options');
    const paint = (locked = false) => {
      list.replaceChildren(...order.map((optionIndex, position) => {
        const row = el('li', 'quiz-option');
        row.append(el('span', undefined, quiz.options[optionIndex]));
        const controls = el('span', 'quiz-order-controls');
        for (const [label, delta] of [['↑', -1], ['↓', 1]] as const) {
          const button = el('button', undefined, label);
          button.type = 'button'; button.disabled = locked || position + delta < 0 || position + delta >= order.length;
          button.setAttribute('aria-label', delta < 0 ? 'Move up' : 'Move down');
          button.addEventListener('click', () => { [order[position], order[position + delta]] = [order[position + delta], order[position]]; paint(); });
          controls.append(button);
        }
        row.append(controls);
        return row;
      }));
    };
    paint();
    body.append(list);
    return { body, read: () => order, lock: () => paint(true) };
  }

  const options = quiz.type === 'truefalse' ? ['True', 'False'] : quiz.options;
  const multiple = quiz.type === 'multiple';
  const selected = new Set<number>();
  const list = el('ul', 'quiz-options');
  const buttons = options.map((label, index) => {
    const button = el('button', 'quiz-option', label);
    button.type = 'button'; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (!multiple) { selected.clear(); buttons.forEach((b) => b.setAttribute('aria-pressed', 'false')); }
      selected.has(index) ? selected.delete(index) : selected.add(index);
      button.setAttribute('aria-pressed', String(selected.has(index)));
    });
    const item = el('li'); item.append(button); list.append(item);
    return button;
  });
  body.append(list);
  const read = (): Response | null => {
    if (!selected.size) return null;
    if (multiple) return [...selected];
    const choice = [...selected][0];
    return quiz.type === 'truefalse' ? choice === 0 : choice;
  };
  const lock = () => {
    const right = (index: number) => quiz.type === 'truefalse' ? (quiz.answer ? 0 : 1) === index
      : multiple ? (quiz as Extract<Quiz, { type: 'multiple' }>).answer.includes(index) : (quiz as Extract<Quiz, { type: 'single' }>).answer === index;
    buttons.forEach((button, index) => {
      button.disabled = true;
      if (right(index)) button.classList.add('is-right');
      else if (selected.has(index)) button.classList.add('is-wrong');
    });
  };
  return { body, read, lock };
}

function mount(container: HTMLElement) {
  let quiz: Quiz;
  try { quiz = JSON.parse(container.dataset.quiz!); } catch (error) { console.error('Bad quiz data', error, container); return; }

  const { body, read, lock } = build(quiz);
  const submit = el('button', 'btn', 'Check answer');
  submit.type = 'button';
  const feedback = el('div', 'quiz-feedback');
  feedback.hidden = true; feedback.setAttribute('aria-live', 'polite');
  const actions = el('div', 'quiz-actions'); actions.append(submit);

  submit.addEventListener('click', () => {
    const response = read();
    if (response === null) { feedback.hidden = false; feedback.className = 'quiz-feedback'; feedback.textContent = 'Choose or type an answer first.'; return; }
    const correct = grade(quiz, response);
    report(quiz, correct);
    feedback.hidden = false;
    feedback.className = `quiz-feedback ${correct ? 'is-right' : 'is-wrong'}`;
    feedback.textContent = `${correct ? 'Correct. ' : 'Not quite. '}${quiz.explain}`;
    lock(correct);
    submit.hidden = true;
    if (!correct) {
      const retry = el('button', 'btn btn-secondary', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', () => mount(container));
      actions.append(retry);
    }
  });

  container.replaceChildren(el('p', 'quiz-question', quiz.question), body, actions, feedback);
}

document.querySelectorAll<HTMLElement>('.quiz[data-quiz]').forEach(mount);
