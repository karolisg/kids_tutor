-- Add-and-subtract sets.
-- The operation CHECK already allows mixed (all four). This column marks the
-- narrower mix without rewriting that constraint. D1 accepts ADD COLUMN.

ALTER TABLE problem_sets ADD COLUMN operation_mix TEXT NOT NULL DEFAULT '' CHECK (operation_mix IN ('', 'add_subtract'));
