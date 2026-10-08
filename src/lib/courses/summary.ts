/** Small pure helpers for the course page: what to show, in what state. Tested in tests/summary.test.mjs. */

/** The first `max` learning goals across all lessons, without repeats. */
export function collectObjectives(lessons: { objectives: string[] }[], max = 6): string[] {
  const seen = new Set<string>();
  for (const lesson of lessons) for (const goal of lesson.objectives) seen.add(goal);
  return [...seen].slice(0, max);
}

export const totalMinutes = (lessons: { minutes?: number }[]) => lessons.reduce((sum, lesson) => sum + (lesson.minutes ?? 0), 0);

/** Where "Continue" should go: the first lesson not done yet, or the first lesson when all are done. */
export function pickResume<T extends { slug: string }>(lessons: T[], done: Set<string>): T {
  return lessons.find((lesson) => !done.has(lesson.slug)) ?? lessons[0];
}

export type LessonState = 'done' | 'next' | 'open' | 'locked';

/** How a lesson row looks on the course page. */
export function lessonState(f: { done: boolean; canRead: boolean; isResume: boolean }): LessonState {
  if (f.done) return 'done';
  if (!f.canRead) return 'locked';
  return f.isResume ? 'next' : 'open';
}

/** Whole-number percent of lessons done (0 when the course has no lessons). */
export const percentDone = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);
