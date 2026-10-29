export const OPERATION_CHOICES = ['add', 'subtract', 'multiply', 'divide', 'add_subtract', 'mixed'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const OPERATIONS = ['add', 'subtract', 'multiply', 'divide'] as const;
export const MIN_MAX_NUMBER = 1;
export const MAX_MAX_NUMBER = 100;
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

export function isOperationChoice(value: string): value is OperationChoice {
  return (OPERATION_CHOICES as readonly string[]).includes(value);
}

export function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

export function isMaxNumber(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_MAX_NUMBER && value <= MAX_MAX_NUMBER;
}

export function checkAnswer(problem: Pick<Problem, 'answer'>, given: number): boolean {
  return problem.answer === given;
}

/** rng must return a number in [0, 1), the same contract as Math.random. */
export function generateProblem(
  choice: OperationChoice,
  difficulty: Difficulty,
  maxNumber: number,
  rng: () => number = Math.random,
): Problem {
  if (!isOperationChoice(choice)) throw new Error('Unknown operation');
  if (!isDifficulty(difficulty)) throw new Error('Unknown difficulty');
  if (!isMaxNumber(maxNumber)) throw new Error('max number must be an integer from 1 to 100');
  return build(pickOperation(choice, rng), difficulty, maxNumber, rng);
}

export function generateSet(
  choice: OperationChoice,
  difficulty: Difficulty,
  count: number,
  maxNumber: number,
  rng: () => number = Math.random,
): Problem[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('count must be a positive integer');
  }
  if (!isOperationChoice(choice)) throw new Error('Unknown operation');
  if (!isDifficulty(difficulty)) throw new Error('Unknown difficulty');
  if (!isMaxNumber(maxNumber)) throw new Error('max number must be an integer from 1 to 100');
  if (choice === 'add_subtract' && count >= 2) {
    const problems = [
      build('add', difficulty, maxNumber, rng),
      build('subtract', difficulty, maxNumber, rng),
    ];
    for (let index = 2; index < count; index += 1) {
      problems.push(generateProblem('add_subtract', difficulty, maxNumber, rng));
    }
    return shuffle(problems, rng);
  }
  const problems: Problem[] = [];
  for (let index = 0; index < count; index += 1) {
    problems.push(generateProblem(choice, difficulty, maxNumber, rng));
  }
  return problems;
}

function pickOperation(choice: OperationChoice, rng: () => number): Operation {
  if (choice === 'mixed') return OPERATIONS[int(rng, 0, OPERATIONS.length - 1)] ?? 'add';
  if (choice === 'add_subtract') return ADD_OR_SUBTRACT[int(rng, 0, ADD_OR_SUBTRACT.length - 1)] ?? 'add';
  return choice;
}

/** Difficulty picks where numbers sit inside the parent's max, and whether subtraction can be negative. */
function lowEnd(difficulty: Difficulty, maxNumber: number): number {
  if (difficulty === 'medium') return Math.min(maxNumber, Math.floor(maxNumber / 5));
  if (difficulty === 'hard') return Math.min(maxNumber, Math.floor(maxNumber / 3));
  return 0;
}

function bounds(difficulty: Difficulty, maxNumber: number, minimum = 0): [number, number] {
  const low = Math.min(maxNumber, Math.max(minimum, lowEnd(difficulty, maxNumber)));
  return [low, maxNumber];
}

function build(operation: Operation, difficulty: Difficulty, maxNumber: number, rng: () => number): Problem {
  switch (operation) {
    case 'add':
    case 'multiply': {
      const [low, high] = bounds(difficulty, maxNumber);
      const left = int(rng, low, high);
      const right = int(rng, low, high);
      const answer = operation === 'add' ? left + right : left * right;
      return { operation, left, right, answer };
    }
    case 'subtract': {
      if (difficulty === 'hard') {
        const left = int(rng, 0, maxNumber);
        const right = int(rng, 0, maxNumber);
        return { operation, left, right, answer: left - right };
      }
      const [low, high] = bounds(difficulty, maxNumber);
      const left = int(rng, low, high);
      const right = int(rng, 0, left);
      return { operation, left, right, answer: left - right };
    }
    case 'divide': {
      const [low, high] = bounds(difficulty, maxNumber, 1);
      const right = int(rng, low, high);
      const answer = int(rng, 1, Math.floor(maxNumber / right));
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
