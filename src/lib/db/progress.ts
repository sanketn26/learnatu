import { db, now } from './client';

export async function completedLessons(userId: string, course: string) {
  const { results } = await db().prepare('SELECT lesson FROM progress WHERE user_id = ? AND course = ?').bind(userId, course).all<{ lesson: string }>();
  return new Set(results.map((row) => row.lesson));
}

export async function completedCounts(userId: string) {
  const { results } = await db().prepare('SELECT course, COUNT(*) AS n FROM progress WHERE user_id = ? GROUP BY course').bind(userId).all<{ course: string; n: number }>();
  return new Map(results.map((row) => [row.course, row.n]));
}

export async function setLessonComplete(userId: string, course: string, lesson: string, complete: boolean) {
  if (complete) {
    await db().prepare('INSERT OR IGNORE INTO progress (user_id, course, lesson, completed_at) VALUES (?, ?, ?, ?)').bind(userId, course, lesson, now()).run();
  } else {
    await db().prepare('DELETE FROM progress WHERE user_id = ? AND course = ? AND lesson = ?').bind(userId, course, lesson).run();
  }
}

export async function recordQuizAttempt(userId: string, course: string, lesson: string, quiz: string, correct: boolean) {
  await db().prepare('INSERT INTO quiz_attempts (user_id, course, lesson, quiz, correct, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(userId, course, lesson, quiz, correct ? 1 : 0, now()).run();
}

/** Quiz ids the user has answered correctly at least once in a lesson. */
export async function passedQuizzes(userId: string, course: string, lesson: string) {
  const { results } = await db().prepare('SELECT DISTINCT quiz FROM quiz_attempts WHERE user_id = ? AND course = ? AND lesson = ? AND correct = 1')
    .bind(userId, course, lesson).all<{ quiz: string }>();
  return new Set(results.map((row) => row.quiz));
}
