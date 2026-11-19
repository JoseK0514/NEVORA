BEGIN;

-- An explicit choice belongs to the authenticated employee account. Keep it
-- outside employees so a language change does not change that row's revision.
CREATE TABLE public.user_language_preferences (
  employee_id text PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'es'))
);

REVOKE ALL ON public.user_language_preferences FROM PUBLIC;
DO $grants$
DECLARE app_role name;
BEGIN
  FOR app_role IN SELECT login_role FROM public.onboarding_runtime_roles WHERE kind = 'APP' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE(language) ON public.user_language_preferences TO %I', app_role);
  END LOOP;
END;
$grants$;

COMMIT;
