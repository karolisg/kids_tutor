import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DIFFICULTIES,
  OPERATION_CHOICES,
  checkAnswer,
  generateProblem,
  generateSet,
  type Operation,
  type OperationChoice,
  type Problem,
} from '../src/math/generate.ts';

function sequence(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function expected(problem: Problem): number {
  switch (problem.operation) {
    case 'add':
      return problem.left + problem.right;
    case 'subtract':
      return problem.left - problem.right;
    case 'multiply':
      return problem.left * problem.right;
    case 'divide':
      return problem.left / problem.right;
  }
}

describe('generateProblem', () => {
  it('builds easy subtraction so the result stays non-negative', () => {
    const low = generateProblem('subtract', 'easy', 10, sequence([0, 0.999]));
    assert.deepEqual(low, { operation: 'subtract', left: 0, right: 0, answer: 0 });

    const high = generateProblem('subtract', 'easy', 10, sequence([0.999, 0.999]));
    assert.equal(high.operation, 'subtract');
    assert.ok(high.right <= high.left);
    assert.ok(high.answer >= 0);
    assert.equal(high.answer, high.left - high.right);
  });

  it('keeps medium subtraction non-negative and allows hard subtraction to go negative', () => {
    const medium = generateProblem('subtract', 'medium', 10, sequence([0, 0.999]));
    assert.equal(medium.answer, 0);
    assert.ok(medium.right <= medium.left);

    const hard = generateProblem('subtract', 'hard', 10, sequence([0, 0.999]));
    assert.equal(hard.left, 0);
    assert.ok(hard.right > hard.left);
    assert.ok(hard.answer < 0);
    assert.equal(hard.answer, hard.left - hard.right);
  });

  it('makes every division problem come out evenly', () => {
    for (const difficulty of DIFFICULTIES) {
      const problem = generateProblem('divide', difficulty, 10, sequence([0, 0]));
      assert.notEqual(problem.right, 0);
      assert.equal(problem.left % problem.right, 0);
      assert.equal(problem.answer, problem.left / problem.right);
      assert.ok(Number.isInteger(problem.answer));
    }
  });

  it('picks each operation for a mixed set from the rng', () => {
    const choices: Array<[number, Operation]> = [
      [0, 'add'],
      [0.25, 'subtract'],
      [0.5, 'multiply'],
      [0.75, 'divide'],
    ];
    for (const [roll, operation] of choices) {
      const problem = generateProblem('mixed', 'easy', 10, sequence([roll, 0.2, 0.2]));
      assert.equal(problem.operation, operation);
    }
  });
});

describe('generateSet', () => {
  it('returns the requested count and the same problems for the same seed', () => {
    const first = generateSet('mixed', 'hard', 8, 10, mulberry32(11));
    const second = generateSet('mixed', 'hard', 8, 10, mulberry32(11));
    assert.equal(first.length, 8);
    assert.deepEqual(first, second);
  });

  it('keeps arithmetic, signs, and division exact across difficulties', () => {
    const operations: OperationChoice[] = [...OPERATION_CHOICES];
    for (const operation of operations) {
      for (const difficulty of DIFFICULTIES) {
        const maxNumber = 15;
        const problems = generateSet(
          operation,
          difficulty,
          40,
          maxNumber,
          mulberry32(operation.length * 17 + difficulty.length),
        );
        assert.equal(problems.length, 40);
        for (const problem of problems) {
          assert.equal(problem.answer, expected(problem));
          assert.ok(problem.left >= 0 && problem.left <= maxNumber);
          assert.ok(problem.right >= 0 && problem.right <= maxNumber);
          assert.ok(Number.isInteger(problem.left));
          assert.ok(Number.isInteger(problem.right));
          assert.ok(Number.isInteger(problem.answer));
          if (operation !== 'mixed' && operation !== 'add_subtract') assert.equal(problem.operation, operation);
          if (operation === 'add_subtract') {
            assert.ok(problem.operation === 'add' || problem.operation === 'subtract');
          }
          if (problem.operation === 'divide') {
            assert.notEqual(problem.right, 0);
            assert.equal(problem.left, problem.right * problem.answer);
          }
          if (problem.operation === 'subtract' && difficulty !== 'hard') {
            assert.ok(problem.answer >= 0);
            assert.ok(problem.right <= problem.left);
          }
        }
      }
    }
  });

  it('mixes only addition and subtraction, and includes both when there is room', () => {
    for (const difficulty of DIFFICULTIES) {
      const problems = generateSet('add_subtract', difficulty, 12, 10, mulberry32(21 + difficulty.length));
      const used = new Set(problems.map((problem) => problem.operation));
      assert.deepEqual([...used].sort(), ['add', 'subtract']);
      for (const problem of problems) {
        assert.notEqual(problem.operation, 'multiply');
        assert.notEqual(problem.operation, 'divide');
      }
    }
    const again = generateSet('add_subtract', 'medium', 12, 10, mulberry32(21 + 'medium'.length));
    assert.deepEqual(again, generateSet('add_subtract', 'medium', 12, 10, mulberry32(21 + 'medium'.length)));
    const single = generateSet('add_subtract', 'easy', 1, 10, sequence([0, 0, 0]));
    assert.equal(single.length, 1);
    assert.ok(single[0]?.operation === 'add' || single[0]?.operation === 'subtract');
  });

  it('rejects a count that is not a positive integer', () => {
    assert.throws(() => generateSet('add', 'easy', 0, 10));
    assert.throws(() => generateSet('add', 'easy', 1.5, 10));
    assert.throws(() => generateSet('add', 'easy', 2, 0));
    assert.throws(() => generateSet('add', 'easy', 2, 101));
  });

  it('keeps both operands at or below the max, and a higher max can be larger', () => {
    for (const difficulty of DIFFICULTIES) {
      const problems = generateSet('add_subtract', difficulty, 16, 10, mulberry32(difficulty.length + 4));
      assert.ok(problems.some((problem) => problem.operation === 'add'));
      assert.ok(problems.some((problem) => problem.operation === 'subtract'));
      for (const problem of problems) {
        assert.ok(problem.left <= 10 && problem.right <= 10);
        assert.ok(problem.operation === 'add' || problem.operation === 'subtract');
      }
    }
    const larger = generateSet('add', 'easy', 4, 40, sequence([0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999]));
    assert.ok(larger.every((problem) => problem.left <= 40 && problem.right <= 40));
    assert.ok(larger.some((problem) => problem.left > 10 || problem.right > 10));
    const capped = generateProblem('multiply', 'hard', 10, sequence([0.999, 0.999]));
    assert.ok(capped.left <= 10 && capped.right <= 10);
    const divided = generateSet('divide', 'easy', 20, 10, mulberry32(8));
    for (const problem of divided) {
      assert.ok(problem.left <= 10 && problem.right <= 10 && problem.right >= 1);
      assert.equal(problem.left % problem.right, 0);
    }
  });
});

describe('checkAnswer', () => {
  it('matches only the exact integer', () => {
    assert.equal(checkAnswer({ answer: 4 }, 4), true);
    assert.equal(checkAnswer({ answer: 4 }, 5), false);
    assert.equal(checkAnswer({ answer: -2 }, -2), true);
    assert.equal(checkAnswer({ answer: 0 }, 0), true);
  });
});
