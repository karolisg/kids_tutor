import { randomUUID } from 'node:crypto';
import { hashSecret, verifySecret } from './auth/password.js';
import type { ChildRow, ParentRow } from './auth/session.js';
import type { SqlDatabase, SqlStatement } from './db/types.js';
import type { Difficulty, OperationChoice, Problem } from './math/generate.js';

export type ProblemSetRow = {
  id: string;
  parent_id: string;
  operation: string;
  difficulty: string;
  problem_count: number;
  created_at: string;
};

export type VisibleProblem = {
  id: string;
  set_id: string;
  position: number;
  left_value: number;
  right_value: number;
  operation: string;
};

export type AttemptRow = {
  id: string;
  set_id: string;
  child_id: string;
  correct_count: number;
  total_count: number;
  started_at: string;
  finished_at: string | null;
};

export type ScoreRow = AttemptRow & {
  operation: string;
  difficulty: string;
  display_name: string;
};

export type StoredAnswer = {
  id: string;
  problem_id: string;
  given_answer: number;
  is_correct: number;
  left_value: number;
  right_value: number;
  operation: string;
  answer: number;
  position: number;
};

export type ChildSummary = {
  id: string;
  parent_id: string;
  display_name: string;
  created_at: string;
};

let dummyPinHash: Promise<string> | null = null;

function dummyHash(): Promise<string> {
  dummyPinHash ??= hashSecret('not-a-real-pin');
  return dummyPinHash;
}

export async function createParent(db: SqlDatabase, email: string, passwordHash: string): Promise<string> {
  const id = randomUUID();
  await db.run(
    'INSERT INTO parents (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    [id, email, passwordHash, new Date().toISOString()],
  );
  return id;
}

export async function findParentByEmail(db: SqlDatabase, email: string): Promise<ParentRow | undefined> {
  return db.get<ParentRow>(
    'SELECT id, email, password_hash, created_at FROM parents WHERE email = ?',
    [email],
  );
}

export async function listChildren(db: SqlDatabase, parentId: string): Promise<ChildSummary[]> {
  return db.all<ChildSummary>(
    `SELECT id, parent_id, display_name, created_at
     FROM children WHERE parent_id = ? ORDER BY created_at ASC`,
    [parentId],
  );
}

export async function findChildByNameForParent(
  db: SqlDatabase,
  parentId: string,
  displayName: string,
): Promise<ChildRow | undefined> {
  return db.get<ChildRow>(
    `SELECT id, parent_id, display_name, pin_hash, created_at
     FROM children WHERE parent_id = ? AND lower(display_name) = lower(?)`,
    [parentId, displayName],
  );
}

export async function createChild(
  db: SqlDatabase,
  parentId: string,
  displayName: string,
  pinHash: string,
): Promise<string> {
  const id = randomUUID();
  await db.run(
    'INSERT INTO children (id, parent_id, display_name, pin_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, parentId, displayName, pinHash, new Date().toISOString()],
  );
  return id;
}

export async function childrenByName(db: SqlDatabase, displayName: string): Promise<ChildRow[]> {
  return db.all<ChildRow>(
    `SELECT id, parent_id, display_name, pin_hash, created_at
     FROM children WHERE lower(display_name) = lower(?)`,
    [displayName],
  );
}

/** Returns the child when exactly one name and PIN match. */
export async function childForPin(
  db: SqlDatabase,
  displayName: string,
  pin: string,
): Promise<ChildRow | null> {
  const candidates = await childrenByName(db, displayName);
  if (candidates.length === 0) {
    await verifySecret(pin, await dummyHash());
    return null;
  }
  const matches: ChildRow[] = [];
  for (const candidate of candidates) {
    if (await verifySecret(pin, candidate.pin_hash)) matches.push(candidate);
  }
  if (matches.length !== 1) return null;
  return matches[0] ?? null;
}

export async function createProblemSet(
  db: SqlDatabase,
  input: {
    parentId: string;
    operation: OperationChoice;
    difficulty: Difficulty;
    problems: Problem[];
  },
): Promise<string> {
  const setId = randomUUID();
  const now = new Date().toISOString();
  const statements: SqlStatement[] = [
    {
      sql: `INSERT INTO problem_sets
        (id, parent_id, operation, difficulty, problem_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      params: [setId, input.parentId, input.operation, input.difficulty, input.problems.length, now],
    },
  ];
  input.problems.forEach((problem, index) => {
    statements.push({
      sql: `INSERT INTO problems
        (id, set_id, position, left_value, right_value, operation, answer)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        randomUUID(),
        setId,
        index + 1,
        problem.left,
        problem.right,
        problem.operation,
        problem.answer,
      ],
    });
  });
  await db.batch(statements);
  return setId;
}

export async function listSets(db: SqlDatabase, parentId: string): Promise<ProblemSetRow[]> {
  return db.all<ProblemSetRow>(
    `SELECT id, parent_id, operation, difficulty, problem_count, created_at
     FROM problem_sets WHERE parent_id = ? ORDER BY created_at DESC LIMIT 30`,
    [parentId],
  );
}

export async function getSetForParent(
  db: SqlDatabase,
  setId: string,
  parentId: string,
): Promise<ProblemSetRow | undefined> {
  return db.get<ProblemSetRow>(
    `SELECT id, parent_id, operation, difficulty, problem_count, created_at
     FROM problem_sets WHERE id = ? AND parent_id = ?`,
    [setId, parentId],
  );
}

export async function listScores(db: SqlDatabase, parentId: string): Promise<ScoreRow[]> {
  return db.all<ScoreRow>(
    `SELECT a.id, a.set_id, a.child_id, a.correct_count, a.total_count, a.started_at, a.finished_at,
            s.operation, s.difficulty, c.display_name
     FROM attempts a
     JOIN problem_sets s ON s.id = a.set_id
     JOIN children c ON c.id = a.child_id
     WHERE c.parent_id = ?
     ORDER BY a.started_at DESC
     LIMIT 40`,
    [parentId],
  );
}

export async function openAttemptsForChild(
  db: SqlDatabase,
  childId: string,
): Promise<{ id: string; set_id: string }[]> {
  return db.all<{ id: string; set_id: string }>(
    `SELECT id, set_id FROM attempts
     WHERE child_id = ? AND finished_at IS NULL
     ORDER BY started_at DESC`,
    [childId],
  );
}

export async function finishedSetIds(db: SqlDatabase, childId: string): Promise<string[]> {
  const rows = await db.all<{ set_id: string }>(
    `SELECT DISTINCT set_id FROM attempts WHERE child_id = ? AND finished_at IS NOT NULL`,
    [childId],
  );
  return rows.map((row) => row.set_id);
}

export async function resumeOrStartAttempt(
  db: SqlDatabase,
  set: ProblemSetRow,
  childId: string,
): Promise<string> {
  const existing = await db.get<{ id: string }>(
    `SELECT id FROM attempts
     WHERE set_id = ? AND child_id = ? AND finished_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
    [set.id, childId],
  );
  if (existing) return existing.id;
  const id = randomUUID();
  await db.run(
    `INSERT INTO attempts (id, set_id, child_id, correct_count, total_count, started_at, finished_at)
     VALUES (?, ?, ?, 0, ?, ?, NULL)`,
    [id, set.id, childId, set.problem_count, new Date().toISOString()],
  );
  return id;
}

export async function getAttemptForChild(
  db: SqlDatabase,
  attemptId: string,
  childId: string,
): Promise<AttemptRow | undefined> {
  return db.get<AttemptRow>(
    `SELECT id, set_id, child_id, correct_count, total_count, started_at, finished_at
     FROM attempts WHERE id = ? AND child_id = ?`,
    [attemptId, childId],
  );
}

/** Next unsolved problem. The answer column stays in the database. */
export async function nextVisibleProblem(
  db: SqlDatabase,
  attempt: AttemptRow,
): Promise<VisibleProblem | undefined> {
  return db.get<VisibleProblem>(
    `SELECT p.id, p.set_id, p.position, p.left_value, p.right_value, p.operation
     FROM problems p
     WHERE p.set_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM attempt_answers aa
         WHERE aa.attempt_id = ? AND aa.problem_id = p.id
       )
     ORDER BY p.position ASC
     LIMIT 1`,
    [attempt.set_id, attempt.id],
  );
}

export async function answerForProblem(
  db: SqlDatabase,
  problemId: string,
): Promise<number | undefined> {
  const row = await db.get<{ answer: number }>(
    'SELECT answer FROM problems WHERE id = ?',
    [problemId],
  );
  return row?.answer;
}

export async function recordAnswer(
  db: SqlDatabase,
  input: {
    attempt: AttemptRow;
    problemId: string;
    given: number;
    correct: boolean;
    finished: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const statements: SqlStatement[] = [
    {
      sql: `INSERT INTO attempt_answers
        (id, attempt_id, problem_id, given_answer, is_correct, answered_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      params: [
        randomUUID(),
        input.attempt.id,
        input.problemId,
        input.given,
        input.correct ? 1 : 0,
        now,
      ],
    },
    {
      sql: 'UPDATE attempts SET correct_count = correct_count + ? WHERE id = ?',
      params: [input.correct ? 1 : 0, input.attempt.id],
    },
  ];
  if (input.finished) {
    statements.push({
      sql: 'UPDATE attempts SET finished_at = ? WHERE id = ? AND finished_at IS NULL',
      params: [now, input.attempt.id],
    });
  }
  await db.batch(statements);
}

export async function reviewAnswer(
  db: SqlDatabase,
  attemptId: string,
  problemId: string,
): Promise<StoredAnswer | undefined> {
  return db.get<StoredAnswer>(
    `SELECT aa.id, aa.problem_id, aa.given_answer, aa.is_correct,
            p.left_value, p.right_value, p.operation, p.answer, p.position
     FROM attempt_answers aa
     JOIN problems p ON p.id = aa.problem_id
     WHERE aa.attempt_id = ? AND aa.problem_id = ?`,
    [attemptId, problemId],
  );
}

export async function listAttemptAnswers(
  db: SqlDatabase,
  attemptId: string,
): Promise<StoredAnswer[]> {
  return db.all<StoredAnswer>(
    `SELECT aa.id, aa.problem_id, aa.given_answer, aa.is_correct,
            p.left_value, p.right_value, p.operation, p.answer, p.position
     FROM attempt_answers aa
     JOIN problems p ON p.id = aa.problem_id
     WHERE aa.attempt_id = ?
     ORDER BY p.position ASC`,
    [attemptId],
  );
}
