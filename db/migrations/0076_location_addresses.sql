BEGIN;

ALTER TABLE locations ADD COLUMN address text
  CONSTRAINT locations_address_length CHECK (char_length(address) BETWEEN 1 AND 300);

COMMIT;
