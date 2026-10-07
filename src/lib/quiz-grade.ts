/** Pure grading logic for the quiz types defined in remark-quiz.mjs. No DOM, so it is unit-testable. */
export type Quiz =
  | { id: string; type: 'single'; question: string; options: string[]; answer: number; explain: string }
  | { id: string; type: 'multiple'; question: string; options: string[]; answer: number[]; explain: string }
  | { id: string; type: 'truefalse'; question: string; answer: boolean; explain: string }
  | { id: string; type: 'fill'; question: string; answer: string[]; explain: string }
  | { id: string; type: 'order'; question: string; options: string[]; explain: string };

/** What the learner submitted: option index, indices, boolean, text, or the option indices in their chosen order. */
export type Response = number | number[] | boolean | string;

const normalise = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

export function grade(quiz: Quiz, response: Response): boolean {
  switch (quiz.type) {
    case 'single': return response === quiz.answer;
    case 'truefalse': return response === quiz.answer;
    case 'multiple': {
      const given = [...(response as number[])].sort();
      return given.length === quiz.answer.length && given.every((value, i) => value === quiz.answer[i]);
    }
    case 'fill': return quiz.answer.some((accepted) => normalise(accepted) === normalise(String(response)));
    // `options` are authored in the correct order, so the right submission is simply 0..n-1.
    case 'order': return (response as number[]).every((value, i) => value === i);
  }
}
