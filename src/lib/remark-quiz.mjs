import { parse } from 'yaml';

/**
 * Turns ```quiz fenced blocks into <div class="quiz" data-quiz="…"> containers.
 * The question and options are also emitted as plain text so the lesson still
 * reads without JavaScript; src/components/quiz.js upgrades them to an
 * interactive widget.
 *
 * Authoring format (YAML inside the fence):
 *   type: single | multiple | truefalse | fill | order
 *   question: text
 *   options: [..]      single/multiple: choices. order: items in the CORRECT order.
 *   answer: 2          single: option number (1-based). multiple: [1, 3].
 *                      truefalse: true | false. fill: "text" or ["text", "alt"].
 *   explain: text      shown after answering
 */
const TYPES = ['single', 'multiple', 'truefalse', 'fill', 'order'];

function fail(file, index, message) {
  throw new Error(`${file?.path ?? 'markdown'}: quiz #${index + 1}: ${message}`);
}

export function validate(raw, file, index) {
  if (!raw || typeof raw !== 'object') fail(file, index, 'must be a YAML mapping');
  const { type, question, options, answer, explain } = raw;
  if (!TYPES.includes(type)) fail(file, index, `type must be one of ${TYPES.join(', ')}`);
  if (typeof question !== 'string' || !question.trim()) fail(file, index, 'question is required');
  const quiz = { type, question: question.trim(), explain: explain ? String(explain).trim() : '' };
  const needsOptions = ['single', 'multiple', 'order'].includes(type);
  if (needsOptions) {
    if (!Array.isArray(options) || options.length < 2) fail(file, index, 'options needs at least 2 items');
    quiz.options = options.map(String);
  }
  const isIndex = (n) => Number.isInteger(n) && n >= 1 && n <= (quiz.options?.length ?? 0);
  if (type === 'single') {
    if (!isIndex(answer)) fail(file, index, 'answer must be an option number (1-based)');
    quiz.answer = answer - 1;
  } else if (type === 'multiple') {
    if (!Array.isArray(answer) || !answer.length || !answer.every(isIndex)) fail(file, index, 'answer must be a list of option numbers (1-based)');
    quiz.answer = [...new Set(answer)].map((n) => n - 1).sort();
  } else if (type === 'truefalse') {
    if (typeof answer !== 'boolean') fail(file, index, 'answer must be true or false');
    quiz.answer = answer;
  } else if (type === 'fill') {
    const list = (Array.isArray(answer) ? answer : [answer]).map((a) => String(a ?? '').trim()).filter(Boolean);
    if (!list.length) fail(file, index, 'answer must be a string or list of accepted strings');
    quiz.answer = list;
  }
  return quiz;
}

const text = (value) => ({ type: 'text', value });
const paragraph = (value) => ({ type: 'paragraph', children: [text(value)] });

function walk(node, file, counter) {
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      if (child.type === 'code' && child.lang === 'quiz') {
        const index = counter.n++;
        let raw;
        try { raw = parse(child.value); } catch (error) { fail(file, index, `invalid YAML — ${error.message}`); }
        const quiz = validate(raw, file, index);
        quiz.id = `q${index + 1}`;
        const fallback = [paragraph(quiz.question)];
        if (quiz.options) {
          fallback.push({
            type: 'list', ordered: quiz.type === 'order', spread: false,
            children: quiz.options.map((option) => ({ type: 'listItem', spread: false, children: [paragraph(option)] }))
          });
        }
        for (const key of ['lang', 'meta', 'value']) delete child[key];
        child.type = 'blockquote';
        child.data = { hName: 'div', hProperties: { className: ['quiz'], dataQuiz: JSON.stringify(quiz) } };
        child.children = fallback;
      } else {
        walk(child, file, counter);
      }
    });
  }
}

export default function remarkQuiz() {
  return (tree, file) => walk(tree, file, { n: 0 });
}
