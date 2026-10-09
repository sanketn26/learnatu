/** A mistake in the text, with the line it is on (1 = first line of the block). */
export interface Problem { line: number; message: string }

export const formatProblems = (problems: Problem[]): string => problems.map((p) => `line ${p.line}: ${p.message}`).join('\n');

/**
 * Thrown by a package's `parse` when the text has mistakes. `problems` lists all of them.
 * Each package subclasses it (FlowSyntaxError, AlgoSyntaxError, PhysSyntaxError) so callers can tell them apart.
 */
export class SyntaxProblems extends Error {
  problems: Problem[];
  constructor(problems: Problem[], name = 'SyntaxProblems') {
    super(formatProblems(problems));
    this.name = name;
    this.problems = problems;
  }
}
