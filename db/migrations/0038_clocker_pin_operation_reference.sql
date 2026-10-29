-- Add exact save evidence without rewriting historical append-only events.
ALTER TABLE clocker_pin_events ADD COLUMN operation_id uuid;
CREATE UNIQUE INDEX clocker_pin_events_operation_id_key
 ON clocker_pin_events(operation_id) WHERE operation_id IS NOT NULL;
