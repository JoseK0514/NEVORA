BEGIN;
-- Publish changes (Jose, October 29, 2026; INPUTS.json businessRules.4*): manual edits to a
-- published week are held until the Owner taps Publish changes. Each held edit keeps one
-- history row (who changed which shift, what changed, when) written in the same transaction
-- as the live shift write. Publish changes marks the week's held rows with the revision that
-- published them. Shift and schedule ids carry no foreign key so a deleted shift keeps its
-- snapshot. Requires only base tables; applied at the end of BASE_MIGRATIONS (order.ts).
CREATE TABLE schedule_pending_edits(
 id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 week_start date NOT NULL,
 location_id text NOT NULL REFERENCES locations(id),
 schedule_id text NOT NULL,
 shift_id text,
 kind text NOT NULL CHECK(kind IN('CREATE','UPDATE','DELETE','COPY')),
 before_snapshot jsonb,
 after_snapshot jsonb,
 actor_employee_id text NOT NULL REFERENCES employees(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 published_revision_id text REFERENCES schedule_publication_revisions(id),
 published_at timestamptz,
 CONSTRAINT schedule_pending_edits_snapshots CHECK(
  (kind IN('CREATE','COPY') AND before_snapshot IS NULL AND after_snapshot IS NOT NULL)
  OR(kind='UPDATE' AND before_snapshot IS NOT NULL AND after_snapshot IS NOT NULL)
  OR(kind='DELETE' AND before_snapshot IS NOT NULL AND after_snapshot IS NULL)),
 CONSTRAINT schedule_pending_edits_publication CHECK((published_revision_id IS NULL)=(published_at IS NULL))
);
CREATE INDEX schedule_pending_edits_held ON schedule_pending_edits(week_start,created_at,id) WHERE published_revision_id IS NULL;
CREATE INDEX schedule_pending_edits_shift ON schedule_pending_edits(shift_id,created_at);
-- History is append-only except for the single held -> published transition.
CREATE FUNCTION schedule_pending_edits_publish_once() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.published_revision_id IS NOT NULL OR NEW.published_revision_id IS NULL
  OR (to_jsonb(NEW)-'published_revision_id'-'published_at') IS DISTINCT FROM (to_jsonb(OLD)-'published_revision_id'-'published_at') THEN
  RAISE EXCEPTION 'schedule_pending_edit_immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER schedule_pending_edits_publish_once BEFORE UPDATE ON schedule_pending_edits
 FOR EACH ROW EXECUTE FUNCTION schedule_pending_edits_publish_once();
COMMIT;
