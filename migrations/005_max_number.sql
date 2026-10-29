-- Parents cap both operands with a max number.
-- Older sets have no stored cap. D1 accepts ADD COLUMN.
-- A NULL check result is allowed, so existing rows stay valid.

ALTER TABLE problem_sets ADD COLUMN max_number INTEGER CHECK (max_number BETWEEN 1 AND 100);
