-- Parents need to read a child's PIN after it is created.
-- pin_hash still checks login. This column is the readable copy.
-- Older rows stay blank because a hash cannot be turned back into a PIN.
-- D1 accepts ADD COLUMN.

ALTER TABLE children ADD COLUMN pin TEXT NOT NULL DEFAULT '';
