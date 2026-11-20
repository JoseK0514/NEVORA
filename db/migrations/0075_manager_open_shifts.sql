BEGIN;

CREATE TABLE public.manager_open_shifts (
  workspace_id text NOT NULL REFERENCES public.workspaces(id),
  id uuid NOT NULL,
  location_id text NOT NULL,
  position_id text NOT NULL REFERENCES public.positions(id),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  time_zone text NOT NULL,
  starts_at timestamptz NOT NULL,
  posted_by text NOT NULL REFERENCES public.employees(id),
  posted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  claimed_by text REFERENCES public.employees(id),
  claimed_at timestamptz,
  -- The receipt survives a normal schedule edit or deletion.
  assignment_id text UNIQUE,
  assignment_visibility text CHECK (assignment_visibility IN ('published', 'draft')),
  withdrawn_by text REFERENCES public.employees(id),
  withdrawn_at timestamptz,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, location_id) REFERENCES public.locations(workspace_id, id),
  CHECK (start_time < time '24:00' AND start_time <> end_time),
  CHECK (starts_at > posted_at),
  CHECK (
    (claimed_by IS NULL AND claimed_at IS NULL AND assignment_id IS NULL AND assignment_visibility IS NULL)
    OR (claimed_by IS NOT NULL AND claimed_at IS NOT NULL AND assignment_id IS NOT NULL
      AND assignment_visibility IS NOT NULL AND claimed_at < starts_at)
  ),
  CHECK ((withdrawn_by IS NULL AND withdrawn_at IS NULL)
    OR (withdrawn_by IS NOT NULL AND withdrawn_at IS NOT NULL AND withdrawn_at < starts_at AND claimed_by IS NULL))
);

CREATE INDEX manager_open_shifts_available
  ON public.manager_open_shifts (workspace_id, starts_at, id)
  WHERE claimed_by IS NULL AND withdrawn_by IS NULL;

ALTER TABLE public.schedule_publication_revisions
  DROP CONSTRAINT schedule_publication_revisions_source_type_check,
  ADD CONSTRAINT schedule_publication_revisions_source_type_check
    CHECK (source_type IN ('PUBLISH', 'EXCHANGE', 'CALLOUT', 'MANAGER_MUTATION', 'OPEN_SHIFT'));

REVOKE ALL ON public.manager_open_shifts FROM PUBLIC;
DO $grants$
DECLARE app_role name;
BEGIN
  FOR app_role IN SELECT login_role FROM public.onboarding_runtime_roles WHERE kind = 'APP' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE(claimed_by, claimed_at, assignment_id, assignment_visibility, withdrawn_by, withdrawn_at) ON public.manager_open_shifts TO %I', app_role);
  END LOOP;
END;
$grants$;

COMMIT;
