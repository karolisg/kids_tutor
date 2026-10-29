-- Question timing for parent review.
-- D1-safe: ADD COLUMN uses a constant default. No PRAGMA or BEGIN/COMMIT.

ALTER TABLE attempt_answers ADD COLUMN shown_at TEXT NOT NULL DEFAULT '';
ALTER TABLE attempt_answers ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS question_shows (
  attempt_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  shown_at TEXT NOT NULL,
  PRIMARY KEY (attempt_id, problem_id),
  FOREIGN KEY (attempt_id) REFERENCES attempts (id),
  FOREIGN KEY (problem_id) REFERENCES problems (id)
);
