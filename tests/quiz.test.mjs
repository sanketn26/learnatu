import test from 'node:test';
import assert from 'node:assert/strict';
import { grade } from '../src/lib/quiz-grade.ts';
import { validate } from '../src/lib/remark-quiz.mjs';

const file = { path: 'x.md' };

test('single: answer is 1-based in source, 0-based after validation', () => {
  const quiz = validate({ type: 'single', question: 'q', options: ['a', 'b'], answer: 2 }, file, 0);
  assert.equal(quiz.answer, 1);
  assert.equal(grade(quiz, 1), true);
  assert.equal(grade(quiz, 0), false);
});

test('multiple requires the exact set', () => {
  const quiz = validate({ type: 'multiple', question: 'q', options: ['a', 'b', 'c'], answer: [1, 3] }, file, 0);
  assert.equal(grade(quiz, [2, 0]), true);
  assert.equal(grade(quiz, [0]), false);
  assert.equal(grade(quiz, [0, 1, 2]), false);
});

test('fill ignores case and extra spaces and accepts alternatives', () => {
  const quiz = validate({ type: 'fill', question: 'q', answer: ['pass code', 'password'] }, file, 0);
  assert.equal(grade(quiz, '  Pass   CODE '), true);
  assert.equal(grade(quiz, 'PASSWORD'), true);
  assert.equal(grade(quiz, 'pin'), false);
});

test('truefalse and order', () => {
  assert.equal(grade(validate({ type: 'truefalse', question: 'q', answer: false }, file, 0), false), true);
  const order = validate({ type: 'order', question: 'q', options: ['a', 'b', 'c'] }, file, 0);
  assert.equal(grade(order, [0, 1, 2]), true);
  assert.equal(grade(order, [1, 0, 2]), false);
});

test('authoring mistakes name the file and quiz number', () => {
  assert.throws(() => validate({ type: 'single', question: 'q', options: ['a', 'b'], answer: 3 }, file, 4), /x\.md: quiz #5: answer must be an option number/);
  assert.throws(() => validate({ type: 'nope', question: 'q' }, file, 0), /type must be one of/);
  assert.throws(() => validate({ type: 'single', question: 'q', options: ['only one'], answer: 1 }, file, 0), /at least 2/);
});
