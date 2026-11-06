-- Setup-only: exact new fictional staging workspace; never a production migration.
DO $native_staging_runtime$
DECLARE item record;
BEGIN
  IF current_database() <> 'nevora_native_staging' OR current_user <> 'nevora_native_installer'
     OR NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id='602501a9-fb90-4bff-a682-95f6c7ef2053' AND name='NEVORA Native QA (Fictional)')
  THEN RAISE EXCEPTION 'native_staging_identity_refused'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nevora_native_app' AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls)
  THEN RAISE EXCEPTION 'native_staging_runtime_role_refused'; END IF;

  REVOKE CREATE ON SCHEMA public FROM PUBLIC, nevora_native_app;
  REVOKE TEMPORARY ON DATABASE nevora_native_staging FROM PUBLIC, nevora_native_app;
  GRANT CONNECT ON DATABASE nevora_native_staging TO nevora_native_app;
  GRANT USAGE ON SCHEMA public TO nevora_native_app;
  REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM nevora_native_app;
  REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM nevora_native_app;
  ALTER DEFAULT PRIVILEGES FOR ROLE nevora_native_installer IN SCHEMA public REVOKE ALL ON TABLES FROM nevora_native_app;
  ALTER DEFAULT PRIVILEGES FOR ROLE nevora_native_installer IN SCHEMA public REVOKE ALL ON SEQUENCES FROM nevora_native_app;

  FOR item IN
    SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')
      AND pg_get_userbyid(c.relowner)='nevora_native_installer'
      AND c.relname <> ALL(ARRAY['clocker_photo_policy','clocker_photo_policy_revisions','clocker_punch_photos',
        'clocker_photo_access_events','clocker_photo_notice_profiles','clocker_photo_notice_revisions',
        'clocker_photo_review_events','clocker_photo_platform_lifecycle','clocker_photo_cleanup_runs'])
  LOOP
    IF item.relkind IN ('r','p') THEN
      EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO nevora_native_app',item.relname);
    ELSE
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO nevora_native_app',item.relname);
    END IF;
  END LOOP;
  FOR item IN
    SELECT sequence.relname FROM pg_class sequence
    JOIN pg_namespace n ON n.oid=sequence.relnamespace
    JOIN pg_depend d ON d.objid=sequence.oid AND d.classid='pg_class'::regclass AND d.deptype IN ('a','i')
    JOIN pg_class owner_table ON owner_table.oid=d.refobjid
    WHERE n.nspname='public' AND sequence.relkind='S'
      AND has_table_privilege('nevora_native_app',owner_table.oid,'INSERT')
  LOOP
    EXECUTE format('GRANT USAGE ON SEQUENCE public.%I TO nevora_native_app',item.relname);
  END LOOP;
  GRANT EXECUTE ON FUNCTION public.nevora_set_company_policy(uuid,text,text,text,integer,jsonb,text) TO nevora_native_app;
  GRANT EXECUTE ON FUNCTION public.nevora_add_workspace_presentation_asset(uuid,text,text,text,integer,integer,bytea,text) TO nevora_native_app;
  GRANT EXECUTE ON FUNCTION public.nevora_set_workspace_presentation(uuid,text,text,integer,jsonb,text) TO nevora_native_app;
  REVOKE ALL ON FUNCTION public.clocker_photo_platform_cleanup(text,text) FROM nevora_native_app;
END;
$native_staging_runtime$;
