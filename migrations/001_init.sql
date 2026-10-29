-- Kids Tutor schema.
-- Keep this file in the SQL subset Cloudflare D1 accepts:
-- no PRAGMA, no attached databases, no BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parent_sessions (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parents (id)
);

CREATE INDEX IF NOT EXISTS idx_parent_sessions_parent ON parent_sessions (parent_id);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parents (id)
);

CREATE INDEX IF NOT EXISTS idx_children_parent ON children (parent_id);
CREATE INDEX IF NOT EXISTS idx_children_name ON children (display_name);

CREATE TABLE IF NOT EXISTS problem_sets (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('add', 'subtract', 'multiply', 'divide', 'mixed')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  problem_count INTEGER NOT NULL CHECK (problem_count BETWEEN 1 AND 20),
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parents (id)
);

CREATE INDEX IF NOT EXISTS idx_problem_sets_parent ON problem_sets (parent_id);

CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  left_value INTEGER NOT NULL,
  right_value INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('add', 'subtract', 'multiply', 'divide')),
  answer INTEGER NOT NULL,
  FOREIGN KEY (set_id) REFERENCES problem_sets (id),
  UNIQUE (set_id, position)
);

CREATE INDEX IF NOT EXISTS idx_problems_set ON problems (set_id, position);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY (set_id) REFERENCES problem_sets (id),
  FOREIGN KEY (child_id) REFERENCES children (id)
);

CREATE INDEX IF NOT EXISTS idx_attempts_child ON attempts (child_id, started_at);
CREATE INDEX IF NOT EXISTS idx_attempts_set ON attempts (set_id, child_id);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  given_answer INTEGER NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  answered_at TEXT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES attempts (id),
  FOREIGN KEY (problem_id) REFERENCES problems (id),
  UNIQUE (attempt_id, problem_id)
);

CREATE TABLE IF NOT EXISTS child_sessions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children (id)
);

CREATE INDEX IF NOT EXISTS idx_child_sessions_child ON child_sessions (child_id);
