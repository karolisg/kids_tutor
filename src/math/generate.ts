export const OPERATION_CHOICES = ['add', 'subtract', 'multiply', 'divide', 'add_subtract', 'mixed'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const OPERATIONS = ['add', 'subtract', 'multiply', 'divide'] as const;
const ADD_OR_SUBTRACT = ['add', 'subtract'] as const;

export type Operation = (typeof OPERATIONS)[number];
export type OperationChoice = (typeof OPERATION_CHOICES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

export type Problem = {
  operation: Operation;
  left: number;
  right: number;
  answer: number;
};

type Range = readonly [number, number];

const ADD: Record<Difficulty, readonly [Range, Range]> = {
  easy: [[0, 9], [0, 9]],
  medium: [[4, 40], [4, 40]],
  hard: [[25, 180], [25, 180]],
};

const MULTIPLY: Record<Difficulty, readonly [Range, Range]> = {
  easy: [[0, 5], [0, 5]],
  medium: [[2, 12], [2, 12]],
  hard: [[4, 15], [6, 18]],
};

/** Divisor range, then quotient range. The dividend is their product. */
const DIVIDE: Record<Difficulty, readonly [Range, Range]> = {
  easy: [[1, 5], [1, 5]],
  medium: [[2, 12], [2, 12]],
  hard: [[3, 16], [6, 24]],
};

const SUBTRACT_MAX: Record<'easy' | 'medium', number> = {
  easy: 12,
  medium: 60,
};

export function isOperationChoice(value: string): value is OperationChoice {
  return (OPERATION_CHOICES as readonly string[]).includes(value);
}

export function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

export function checkAnswer(problem: Pick<Problem, 'answer'>, given: number): boolean {
  return problem.answer === given;
}

/** rng must return a number in [0, 1), the same contract as Math.random. */
export function generateProblem(
  choice: OperationChoice,
  difficulty: Difficulty,
  rng: () => number = Math.random,
): Problem {
  if (!isOperationChoice(choice)) throw new Error('Unknown operation');
  if (!isDifficulty(difficulty)) throw new Error('Unknown difficulty');
  return build(pickOperation(choice, rng), difficulty, rng);
}

export function generateSet(
  choice: OperationChoice,
  difficulty: Difficulty,
  count: number,
  rng: () => number = Math.random,
): Problem[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('count must be a positive integer');
  }
  if (!isOperationChoice(choice)) throw new Error('Unknown operation');
  if (!isDifficulty(difficulty)) throw new Error('Unknown difficulty');
  if (choice === 'add_subtract' && count >= 2) {
    const problems = [
      build('add', difficulty, rng),
      build('subtract', difficulty, rng),
    ];
    for (let index = 2; index < count; index += 1) {
      problems.push(generateProblem('add_subtract', difficulty, rng));
    }
    return shuffle(problems, rng);
  }
  const problems: Problem[] = [];
  for (let index = 0; index < count; index += 1) {
    problems.push(generateProblem(choice, difficulty, rng));
  }
  return problems;
}

function pickOperation(choice: OperationChoice, rng: () => number): Operation {
  if (choice === 'mixed') return OPERATIONS[int(rng, 0, OPERATIONS.length - 1)] ?? 'add';
  if (choice === 'add_subtract') return ADD_OR_SUBTRACT[int(rng, 0, ADD_OR_SUBTRACT.length - 1)] ?? 'add';
  return choice;
}

function build(operation: Operation, difficulty: Difficulty, rng: () => number): Problem {
  switch (operation) {
    case 'add': {
      const ranges = ADD[difficulty];
      const left = int(rng, ranges[0][0], ranges[0][1]);
      const right = int(rng, ranges[1][0], ranges[1][1]);
      return { operation, left, right, answer: left + right };
    }
    case 'subtract': {
      if (difficulty === 'hard') {
        const left = int(rng, 0, 150);
        const right = int(rng, 0, 150);
        return { operation, left, right, answer: left - right };
      }
      const max = SUBTRACT_MAX[difficulty];
      const left = int(rng, 0, max);
      const right = int(rng, 0, left);
      return { operation, left, right, answer: left - right };
    }
    case 'multiply': {
      const ranges = MULTIPLY[difficulty];
      const left = int(rng, ranges[0][0], ranges[0][1]);
      const right = int(rng, ranges[1][0], ranges[1][1]);
      return { operation, left, right, answer: left * right };
    }
    case 'divide': {
      const ranges = DIVIDE[difficulty];
      const right = int(rng, ranges[0][0], ranges[0][1]);
      const answer = int(rng, ranges[1][0], ranges[1][1]);
      return { operation, left: right * answer, right, answer };
    }
  }
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = int(rng, 0, index);
    const current = copy[index];
    const other = copy[swap];
    if (current === undefined || other === undefined) continue;
    copy[index] = other;
    copy[swap] = current;
  }
  return copy;
}

function int(rng: () => number, min: number, max: number): number {
  const span = max - min + 1;
  const value = min + Math.floor(rng() * span);
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
