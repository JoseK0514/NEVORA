BEGIN;
ALTER TABLE commerce.tokens ADD COLUMN owner_binding text;
COMMIT;
