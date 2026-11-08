BEGIN;
CREATE TABLE public.nevora_commerce_installation (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 workspace_id text NOT NULL REFERENCES public.workspaces(id), business_id text NOT NULL UNIQUE, installation_id text NOT NULL UNIQUE,
 environment text NOT NULL CHECK(environment IN('test','development','production')),
 incarnation bigint NOT NULL CHECK(incarnation>0), canonical_origin text NOT NULL,
 instance_secret_hash text NOT NULL CHECK(instance_secret_hash~'^[a-f0-9]{64}$'),
 provisioned_at timestamptz NOT NULL DEFAULT clock_timestamp(), employee_limit integer NOT NULL DEFAULT 30 CHECK(employee_limit IN(15,30))
);
REVOKE ALL ON public.nevora_commerce_installation FROM PUBLIC;
CREATE FUNCTION public.nevora_commerce_apply_capacity(p_business text,p_installation text,p_secret text,p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF p_limit NOT IN(15,30) OR length(p_secret)<>43 THEN RETURN false; END IF;
 PERFORM 1 FROM public.onboarding_workspace_identity a JOIN public.onboarding_runtime_roles r ON r.kind='APP' AND r.login_role=session_user
 JOIN public.nevora_commerce_installation i ON i.workspace_id=a.workspace_id::text AND i.environment=a.environment AND i.incarnation=a.incarnation
 WHERE a.singleton AND a.lifecycle='ACTIVE' AND i.business_id=p_business AND i.installation_id=p_installation
 AND i.instance_secret_hash=encode(sha256(convert_to(p_secret,'UTF8')),'hex') FOR SHARE OF a;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.nevora_commerce_installation SET employee_limit=p_limit WHERE singleton AND business_id=p_business AND installation_id=p_installation;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.nevora_commerce_apply_capacity(text,text,text,integer) FROM PUBLIC;
CREATE FUNCTION public.nevora_commerce_employee_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE capacity integer; existing integer;
BEGIN
 IF NOT NEW.active OR NEW.role='OWNER' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.active AND OLD.role<>'OWNER' THEN RETURN NEW; END IF; END IF;
 SELECT employee_limit INTO capacity FROM public.nevora_commerce_installation WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN RETURN NEW; END IF;
 SELECT count(*) INTO existing FROM public.employees WHERE active AND role<>'OWNER';
 IF existing>=capacity THEN RAISE EXCEPTION 'commerce_employee_limit' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.nevora_commerce_employee_capacity() FROM PUBLIC;
CREATE TRIGGER nevora_commerce_employee_capacity BEFORE INSERT OR UPDATE OF active,role ON public.employees FOR EACH ROW EXECUTE FUNCTION public.nevora_commerce_employee_capacity();
COMMIT;
