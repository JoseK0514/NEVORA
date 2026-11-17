-- Owner-published guidance, separate from enforced operational policies.
BEGIN;
CREATE TABLE owner_advisor_company_knowledge_state (
  workspace_id text PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 0 CHECK (revision>=0)
);
CREATE TABLE owner_advisor_company_knowledge_entries (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN ('profile','document')),
  created_by text NOT NULL REFERENCES employees(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_version uuid,
  archived_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY(workspace_id,id)
);
CREATE UNIQUE INDEX owner_advisor_company_profile_one ON owner_advisor_company_knowledge_entries(workspace_id) WHERE kind='profile' AND deleted_at IS NULL;
CREATE TABLE owner_advisor_company_knowledge_versions (
  workspace_id text NOT NULL,
  document_id uuid NOT NULL,
  id uuid NOT NULL,
  title text NOT NULL CHECK(octet_length(title)<=240),
  locale text NOT NULL CHECK(locale IN ('en','es')),
  category text NOT NULL CHECK(category IN ('profile','operations','products','service','policy','other')),
  body text CHECK(octet_length(body)<=262144),
  profile_fields jsonb,
  source_name text CHECK(octet_length(source_name)<=120),
  text_digest text NOT NULL CHECK(text_digest ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL REFERENCES employees(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  effective_from timestamptz,
  effective_until timestamptz,
  review_due timestamptz,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig,coalesce(title,'')||' '||coalesce(body,''))) STORED,
  PRIMARY KEY(workspace_id,document_id,id),
  FOREIGN KEY(workspace_id,document_id) REFERENCES owner_advisor_company_knowledge_entries(workspace_id,id) ON DELETE CASCADE,
  CHECK(effective_from IS NULL OR effective_until IS NULL OR effective_until>effective_from)
);
ALTER TABLE owner_advisor_company_knowledge_entries ADD CONSTRAINT owner_company_knowledge_published_version FOREIGN KEY(workspace_id,id,published_version) REFERENCES owner_advisor_company_knowledge_versions(workspace_id,document_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX owner_company_knowledge_search ON owner_advisor_company_knowledge_versions USING gin(search_vector);
CREATE TABLE owner_advisor_company_knowledge_operations (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  actor_id text NOT NULL REFERENCES employees(id),
  session_hash text NOT NULL,
  authority text NOT NULL,
  command_hash text NOT NULL,
  receipt jsonb NOT NULL,
  PRIMARY KEY(workspace_id,operation_id)
);
ALTER TABLE owner_advisor_profiles ADD COLUMN knowledge_fingerprint text;
ALTER TABLE owner_advisor_requests ADD COLUMN knowledge_fingerprint text;

-- Caller must apply current Owner/company guards around this transaction.
-- Workspace locking makes revision, quota, immutable receipt and publication
-- one all-or-none change. No provider or operational writer is called here.
CREATE FUNCTION owner_advisor_company_knowledge_mutate(
 p_workspace text,p_actor text,p_session text,p_authority text,p_request uuid,
 p_hash text,p_expected integer,p_op text,p_payload jsonb,p_new_entry uuid,p_new_version uuid
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE previous owner_advisor_company_knowledge_operations%ROWTYPE;
 entry owner_advisor_company_knowledge_entries%ROWTYPE;
 version owner_advisor_company_knowledge_versions%ROWTYPE;
 current_revision integer;
 target uuid;
 bytes integer;
 receipt jsonb;
 state_name text;
BEGIN
 PERFORM id FROM workspaces WHERE id=p_workspace FOR NO KEY UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'company_knowledge_conflict'; END IF;
 SELECT * INTO previous FROM owner_advisor_company_knowledge_operations WHERE workspace_id=p_workspace AND operation_id=p_request;
 IF FOUND THEN
  IF previous.actor_id<>p_actor OR previous.session_hash<>p_session OR previous.authority<>p_authority OR previous.command_hash<>p_hash THEN RAISE EXCEPTION 'company_knowledge_conflict'; END IF;
  RETURN previous.receipt;
 END IF;
 INSERT INTO owner_advisor_company_knowledge_state(workspace_id) VALUES(p_workspace) ON CONFLICT DO NOTHING;
 SELECT revision INTO current_revision FROM owner_advisor_company_knowledge_state WHERE workspace_id=p_workspace;
 IF current_revision<>p_expected THEN RAISE EXCEPTION 'company_knowledge_conflict'; END IF;
 IF p_op IN ('draft_profile','draft_document') THEN
  bytes:=octet_length(p_payload->>'body');
  IF bytes IS NULL OR bytes<1 OR bytes>(CASE WHEN p_op='draft_profile' THEN 16384 ELSE 262144 END) THEN RAISE EXCEPTION 'company_knowledge_limit'; END IF;
  IF (SELECT count(*) FROM owner_advisor_company_knowledge_versions WHERE workspace_id=p_workspace AND body IS NOT NULL)>=100 OR
     (SELECT coalesce(sum(octet_length(body)),0) FROM owner_advisor_company_knowledge_versions WHERE workspace_id=p_workspace)+bytes>10485760 THEN RAISE EXCEPTION 'company_knowledge_limit'; END IF;
  IF p_op='draft_profile' THEN
   SELECT * INTO entry FROM owner_advisor_company_knowledge_entries WHERE workspace_id=p_workspace AND kind='profile' AND deleted_at IS NULL;
   target:=entry.id;
  ELSE target:=(p_payload->>'documentId')::uuid; END IF;
  IF target IS NULL THEN
   IF p_op='draft_document' AND (SELECT count(*) FROM owner_advisor_company_knowledge_entries WHERE workspace_id=p_workspace AND kind='document' AND deleted_at IS NULL)>=20 THEN RAISE EXCEPTION 'company_knowledge_limit'; END IF;
   target:=p_new_entry;
   INSERT INTO owner_advisor_company_knowledge_entries(workspace_id,id,kind,created_by) VALUES(p_workspace,target,CASE WHEN p_op='draft_profile' THEN 'profile' ELSE 'document' END,p_actor);
  ELSE
   SELECT * INTO entry FROM owner_advisor_company_knowledge_entries WHERE workspace_id=p_workspace AND id=target AND deleted_at IS NULL;
   IF NOT FOUND OR entry.kind<>(CASE WHEN p_op='draft_profile' THEN 'profile' ELSE 'document' END) THEN RAISE EXCEPTION 'company_knowledge_conflict'; END IF;
   UPDATE owner_advisor_company_knowledge_entries SET archived_at=NULL WHERE workspace_id=p_workspace AND id=target;
  END IF;
  INSERT INTO owner_advisor_company_knowledge_versions(workspace_id,document_id,id,title,locale,category,body,profile_fields,source_name,text_digest,created_by,effective_from,effective_until,review_due)
  VALUES(p_workspace,target,p_new_version,p_payload->>'title',p_payload->>'locale',p_payload->>'category',p_payload->>'body',CASE WHEN p_op='draft_profile' THEN p_payload->'fields' ELSE NULL END,p_payload->>'sourceName',p_payload->>'textDigest',p_actor,(p_payload->>'effectiveFrom')::timestamptz,(p_payload->>'effectiveUntil')::timestamptz,(p_payload->>'reviewDue')::timestamptz);
  state_name:='draft_saved';
  receipt:=jsonb_build_object('versionId',p_new_version,'textDigest',p_payload->>'textDigest');
 ELSE
  target:=(p_payload->>'documentId')::uuid;
  SELECT * INTO entry FROM owner_advisor_company_knowledge_entries WHERE workspace_id=p_workspace AND id=target AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'company_knowledge_conflict'; END IF;
  IF p_op='publish' THEN
   SELECT * INTO version FROM owner_advisor_company_knowledge_versions WHERE workspace_id=p_workspace AND document_id=target AND id=(p_payload->>'versionId')::uuid AND body IS NOT NULL;
   IF NOT FOUND OR version.published_at IS NOT NULL OR version.text_digest<>p_payload->>'reviewedTextDigest' THEN RAISE EXCEPTION 'company_knowledge_conflict'; END IF;
   UPDATE owner_advisor_company_knowledge_versions SET published_at=clock_timestamp() WHERE workspace_id=p_workspace AND document_id=target AND id=version.id;
   UPDATE owner_advisor_company_knowledge_entries SET published_version=version.id,archived_at=NULL WHERE workspace_id=p_workspace AND id=target;
   state_name:='published';receipt:=jsonb_build_object('versionId',version.id,'textDigest',version.text_digest);
  ELSIF p_op='archive' THEN
   UPDATE owner_advisor_company_knowledge_entries SET published_version=NULL,archived_at=clock_timestamp() WHERE workspace_id=p_workspace AND id=target;
   state_name:='archived';receipt:='{}'::jsonb;
  ELSIF p_op='delete' AND p_payload->>'acknowledged'='true' THEN
   UPDATE owner_advisor_company_knowledge_entries SET published_version=NULL,deleted_at=clock_timestamp() WHERE workspace_id=p_workspace AND id=target;
   UPDATE owner_advisor_company_knowledge_versions SET body=NULL,profile_fields=NULL,title='Deleted source',source_name=NULL WHERE workspace_id=p_workspace AND document_id=target;
   state_name:='deleted';receipt:='{}'::jsonb;
  ELSE RAISE EXCEPTION 'company_knowledge_conflict'; END IF;
 END IF;
 UPDATE owner_advisor_company_knowledge_state SET revision=revision+1 WHERE workspace_id=p_workspace RETURNING revision INTO current_revision;
 receipt:=receipt||jsonb_build_object('state',state_name,'operationId',p_request,'documentId',target,'revision',current_revision,'savedAt',clock_timestamp());
 INSERT INTO owner_advisor_company_knowledge_operations(workspace_id,operation_id,actor_id,session_hash,authority,command_hash,receipt) VALUES(p_workspace,p_request,p_actor,p_session,p_authority,p_hash,receipt);
 RETURN receipt;
END; $$;
COMMIT;
