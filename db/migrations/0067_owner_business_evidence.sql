BEGIN;
-- Local reviewed source custody only; no provider, payment, order or payroll writers.
CREATE TABLE owner_advisor_business_state (
 workspace_id text PRIMARY KEY REFERENCES workspaces(id), revision bigint NOT NULL DEFAULT 0,
 evidence_revision bigint NOT NULL DEFAULT 0, map_revision bigint NOT NULL DEFAULT 0,
 CHECK(revision BETWEEN 0 AND 9007199254740990 AND evidence_revision BETWEEN 0 AND 9007199254740990 AND map_revision BETWEEN 0 AND 9007199254740990)
);
CREATE TABLE owner_advisor_business_sources (
 workspace_id text NOT NULL REFERENCES workspaces(id), source_id uuid NOT NULL,
 domain text NOT NULL CHECK(domain IN('FINANCE','SALES')), namespace text NOT NULL CHECK(octet_length(namespace) BETWEEN 1 AND 128),
 currency text NOT NULL CHECK(currency IN('USD','EUR')), scale integer NOT NULL CHECK(scale=2),
 name text NOT NULL CHECK(octet_length(name)<=240), max_age_minutes integer NOT NULL CHECK(max_age_minutes BETWEEN 15 AND 10080),
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740990), active boolean NOT NULL DEFAULT false,
 deleted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,source_id)
);
CREATE UNIQUE INDEX owner_business_source_namespace ON owner_advisor_business_sources(workspace_id,domain,namespace,currency) WHERE NOT deleted;
CREATE TABLE owner_advisor_business_versions (
 workspace_id text NOT NULL, source_id uuid NOT NULL, version_id uuid NOT NULL,
 owner_id text NOT NULL REFERENCES employees(id), time_zone text NOT NULL CHECK(octet_length(time_zone) BETWEEN 1 AND 128), digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 from_at timestamptz NOT NULL, to_at timestamptz NOT NULL CHECK(to_at>from_at), source_as_of timestamptz NOT NULL,
 completeness text NOT NULL CHECK(completeness IN('COMPLETE','PARTIAL')),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','PUBLISHED','DISCARDED','ERASED')),
 payload text CHECK(payload IS NULL OR (octet_length(payload)<=524288 AND jsonb_typeof(payload::jsonb)='object' AND jsonb_array_length(payload::jsonb->'records')<=1000)),
 payload_bytes integer GENERATED ALWAYS AS (COALESCE(octet_length(payload),0)) STORED,
 row_count integer GENERATED ALWAYS AS (COALESCE(jsonb_array_length(payload::jsonb->'records'),0)) STORED,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), published_at timestamptz,
 PRIMARY KEY(workspace_id,source_id,version_id), UNIQUE(workspace_id,version_id),
 FOREIGN KEY(workspace_id,source_id) REFERENCES owner_advisor_business_sources(workspace_id,source_id),
 CHECK((status IN('DISCARDED','ERASED'))=(payload IS NULL)), CHECK(source_as_of>=to_at OR completeness='PARTIAL')
);
CREATE TABLE owner_advisor_business_windows (
 workspace_id text NOT NULL, source_id uuid NOT NULL, from_at timestamptz NOT NULL, to_at timestamptz NOT NULL, version_id uuid NOT NULL,
 PRIMARY KEY(workspace_id,source_id,from_at,to_at), UNIQUE(workspace_id,version_id),
 FOREIGN KEY(workspace_id,source_id,version_id) REFERENCES owner_advisor_business_versions(workspace_id,source_id,version_id)
);
CREATE TABLE owner_advisor_business_record_digests (
 workspace_id text NOT NULL, source_id uuid NOT NULL, version_id uuid NOT NULL, record_id text NOT NULL, revision text NOT NULL,
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(workspace_id,source_id,version_id,record_id),
 FOREIGN KEY(workspace_id,source_id,version_id) REFERENCES owner_advisor_business_versions(workspace_id,source_id,version_id)
);
CREATE INDEX owner_business_record_identity ON owner_advisor_business_record_digests(workspace_id,source_id,record_id,revision);
CREATE TABLE owner_advisor_business_maps (
 workspace_id text NOT NULL REFERENCES workspaces(id), map_version_id uuid NOT NULL, owner_id text NOT NULL REFERENCES employees(id),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'), payload text CHECK(payload IS NULL OR (octet_length(payload)<=524288 AND jsonb_typeof(payload::jsonb)='object')),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','PUBLISHED','DISCARDED')), current boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(workspace_id,map_version_id),
 CHECK((status='DISCARDED')=(payload IS NULL)), CHECK(NOT current OR status='PUBLISHED')
);
CREATE UNIQUE INDEX owner_business_current_map ON owner_advisor_business_maps(workspace_id) WHERE current;
CREATE TABLE owner_advisor_business_operations (
 workspace_id text NOT NULL REFERENCES workspaces(id), owner_id text NOT NULL REFERENCES employees(id), request_id uuid NOT NULL,
 command_kind text NOT NULL, command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'running' CHECK(state IN('running','completed')), receipt jsonb,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(workspace_id,owner_id,request_id),
 UNIQUE(workspace_id,request_id), CHECK((state='completed')=(receipt IS NOT NULL)),
 CHECK(receipt IS NULL OR (jsonb_typeof(receipt)='object' AND octet_length(receipt::text)<=1024))
);
CREATE TABLE owner_advisor_business_read_receipts (
 workspace_id text NOT NULL REFERENCES workspaces(id), owner_id text NOT NULL REFERENCES employees(id), request_id uuid NOT NULL,
 read_receipt_id uuid NOT NULL, source_id uuid, version_id uuid, map_version_id uuid, digest text NOT NULL,
 revision bigint NOT NULL, evidence_revision bigint NOT NULL, authority text NOT NULL, session_hash text NOT NULL,
 context_digest text NOT NULL CHECK(context_digest ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '5 minutes', PRIMARY KEY(workspace_id,owner_id,request_id),
 UNIQUE(workspace_id,read_receipt_id)
);
CREATE TABLE owner_advisor_business_inspections (
 workspace_id text NOT NULL REFERENCES workspaces(id), owner_id text NOT NULL REFERENCES employees(id), inspection_id uuid NOT NULL,
 query_hash text NOT NULL CHECK(query_hash ~ '^[a-f0-9]{64}$'), authority text NOT NULL, session_hash text NOT NULL,
 context jsonb CHECK(context IS NULL OR octet_length(context::text)<=8192), fence jsonb CHECK(fence IS NULL OR octet_length(fence::text)<=65536),
 result text CHECK(result IS NULL OR octet_length(result)<=65536),
 state text NOT NULL DEFAULT 'running' CHECK(state IN('running','completed','expired')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '15 seconds',
 PRIMARY KEY(workspace_id,owner_id,inspection_id), UNIQUE(workspace_id,inspection_id)
);
CREATE FUNCTION owner_business_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF;
 IF TG_TABLE_NAME='owner_advisor_business_operations' THEN
  IF ROW(NEW.workspace_id,NEW.owner_id,NEW.request_id,NEW.command_kind,NEW.command_hash,NEW.created_at) IS DISTINCT FROM ROW(OLD.workspace_id,OLD.owner_id,OLD.request_id,OLD.command_kind,OLD.command_hash,OLD.created_at)
   OR (OLD.state='completed' AND NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF;
 ELSIF TG_TABLE_NAME='owner_advisor_business_versions' THEN
  IF ROW(NEW.workspace_id,NEW.source_id,NEW.version_id,NEW.owner_id,NEW.time_zone,NEW.digest,NEW.from_at,NEW.to_at,NEW.source_as_of,NEW.completeness,NEW.created_at) IS DISTINCT FROM ROW(OLD.workspace_id,OLD.source_id,OLD.version_id,OLD.owner_id,OLD.time_zone,OLD.digest,OLD.from_at,OLD.to_at,OLD.source_as_of,OLD.completeness,OLD.created_at)
   OR (NEW.payload IS DISTINCT FROM OLD.payload AND NOT(OLD.payload IS NOT NULL AND NEW.payload IS NULL AND NEW.status IN('DISCARDED','ERASED')))
   OR (OLD.status='PUBLISHED' AND NEW.status NOT IN('PUBLISHED','ERASED')) OR (OLD.status='DISCARDED' AND NEW.status NOT IN('DISCARDED','ERASED')) OR (OLD.status='ERASED' AND NEW IS DISTINCT FROM OLD)
   OR (OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at)
  THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF;
 ELSIF TG_TABLE_NAME='owner_advisor_business_maps' THEN
  IF ROW(NEW.workspace_id,NEW.map_version_id,NEW.owner_id,NEW.digest,NEW.created_at) IS DISTINCT FROM ROW(OLD.workspace_id,OLD.map_version_id,OLD.owner_id,OLD.digest,OLD.created_at)
   OR (NEW.payload IS DISTINCT FROM OLD.payload AND NOT(OLD.payload IS NOT NULL AND NEW.payload IS NULL AND NEW.status='DISCARDED'))
   OR (OLD.status='DISCARDED' AND NEW IS DISTINCT FROM OLD) OR (OLD.status='PUBLISHED' AND NEW.status='DRAFT') THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER owner_business_version_immutable BEFORE UPDATE OR DELETE ON owner_advisor_business_versions FOR EACH ROW EXECUTE FUNCTION owner_business_immutable();
CREATE TRIGGER owner_business_map_immutable BEFORE UPDATE OR DELETE ON owner_advisor_business_maps FOR EACH ROW EXECUTE FUNCTION owner_business_immutable();
CREATE TRIGGER owner_business_operation_immutable BEFORE UPDATE OR DELETE ON owner_advisor_business_operations FOR EACH ROW EXECUTE FUNCTION owner_business_immutable();

CREATE FUNCTION owner_business_source_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF;
 IF ROW(NEW.workspace_id,NEW.source_id,NEW.domain,NEW.currency,NEW.scale,NEW.created_at) IS DISTINCT FROM ROW(OLD.workspace_id,OLD.source_id,OLD.domain,OLD.currency,OLD.scale,OLD.created_at)
  OR (OLD.deleted AND NEW IS DISTINCT FROM OLD)
  OR (NEW.namespace IS DISTINCT FROM OLD.namespace AND NOT(NEW.deleted AND NOT NEW.active AND NEW.namespace='erased:'||OLD.source_id::text))
 THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER owner_business_source_immutable BEFORE UPDATE OR DELETE ON owner_advisor_business_sources FOR EACH ROW EXECUTE FUNCTION owner_business_source_immutable();
CREATE FUNCTION owner_business_record_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER owner_business_record_immutable BEFORE UPDATE ON owner_advisor_business_record_digests FOR EACH ROW EXECUTE FUNCTION owner_business_record_immutable();
CREATE FUNCTION owner_business_inspection_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF;
 IF ROW(NEW.workspace_id,NEW.owner_id,NEW.inspection_id,NEW.query_hash,NEW.authority,NEW.session_hash,NEW.created_at,NEW.expires_at) IS DISTINCT FROM ROW(OLD.workspace_id,OLD.owner_id,OLD.inspection_id,OLD.query_hash,OLD.authority,OLD.session_hash,OLD.created_at,OLD.expires_at)
 THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF;
 IF NEW.state='expired' AND NEW.context IS NULL AND NEW.fence IS NULL AND NEW.result IS NULL THEN RETURN NEW; END IF;
 IF NEW.context IS DISTINCT FROM OLD.context OR (OLD.state<>'running' AND NEW IS DISTINCT FROM OLD) OR (OLD.state='running' AND NEW.state NOT IN('running','completed')) THEN RAISE EXCEPTION 'advisor_business_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER owner_business_inspection_immutable BEFORE UPDATE OR DELETE ON owner_advisor_business_inspections FOR EACH ROW EXECUTE FUNCTION owner_business_inspection_immutable();

-- Callers take workspace NO KEY UPDATE and current Owner/session guards before
-- this function. One transaction makes mutation and content-free receipt inseparable.
CREATE FUNCTION owner_business_execute(w text,o text,r uuid,h text,a text,session text,c jsonb,p text,d text,rd jsonb,ctx text,valid_until timestamptz)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
 op owner_advisor_business_operations%ROWTYPE; st owner_advisor_business_state%ROWTYPE;
 s owner_advisor_business_sources%ROWTYPE; v owner_advisor_business_versions%ROWTYPE; m owner_advisor_business_maps%ROWTYPE;
 rr owner_advisor_business_read_receipts%ROWTYPE; sid uuid; vid uuid; mid uuid; rev bigint; saved_receipt jsonb; item jsonb;
 kind text:=c->>'op'; expected bigint; source jsonb;
BEGIN
 SELECT * INTO op FROM owner_advisor_business_operations WHERE workspace_id=w AND owner_id=o AND request_id=r FOR UPDATE;
 IF NOT FOUND OR op.command_hash<>h OR op.command_kind<>kind THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
 IF op.state='completed' THEN RETURN op.receipt; END IF;
 INSERT INTO owner_advisor_business_state(workspace_id) VALUES(w) ON CONFLICT DO NOTHING;
 SELECT * INTO st FROM owner_advisor_business_state WHERE workspace_id=w FOR UPDATE;
 DELETE FROM owner_advisor_business_read_receipts WHERE workspace_id=w AND expires_at<=clock_timestamp();
 IF kind='stage_source_version' THEN
  IF c->>'format'<>'JSON' OR p::jsonb IS DISTINCT FROM c->'input' THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
  source:=c->'input'->'source'; sid:=(source->>'sourceId')::uuid; expected:=(source->>'expectedRevision')::bigint;
  IF (SELECT count(*) FROM owner_advisor_business_versions WHERE workspace_id=w AND payload IS NOT NULL)+(SELECT count(*) FROM owner_advisor_business_maps WHERE workspace_id=w AND payload IS NOT NULL)>=200
   OR (SELECT count(*) FROM owner_advisor_business_versions WHERE workspace_id=w AND status='DRAFT')+(SELECT count(*) FROM owner_advisor_business_maps WHERE workspace_id=w AND status='DRAFT')>=20
   OR (SELECT COALESCE(sum(row_count),0) FROM owner_advisor_business_versions WHERE workspace_id=w)+jsonb_array_length(c->'input'->'records')>100000 THEN RAISE EXCEPTION 'advisor_business_limit'; END IF;
  IF (c->'input'->>'sourceAsOf')::timestamptz>clock_timestamp() THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
  IF sid IS NULL THEN
   IF expected<>0 THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
   IF (SELECT count(*) FROM owner_advisor_business_sources WHERE workspace_id=w AND NOT deleted)>=20 THEN RAISE EXCEPTION 'advisor_business_limit'; END IF;
   sid:=gen_random_uuid();
   INSERT INTO owner_advisor_business_sources(workspace_id,source_id,domain,namespace,currency,scale,name,max_age_minutes,revision)
    VALUES(w,sid,source->>'domain',source->>'namespace',source->>'currency',(source->>'scale')::int,source->>'name',(source->>'maxAgeMinutes')::int,1); rev:=1;
  ELSE
   SELECT * INTO s FROM owner_advisor_business_sources WHERE workspace_id=w AND source_id=sid FOR UPDATE;
   IF NOT FOUND OR s.deleted OR s.revision<>expected OR ROW(s.domain,s.namespace,s.currency,s.scale) IS DISTINCT FROM ROW(source->>'domain',source->>'namespace',source->>'currency',(source->>'scale')::int) THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
   UPDATE owner_advisor_business_sources SET revision=revision+1 WHERE workspace_id=w AND source_id=sid RETURNING revision INTO rev;
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(rd) LOOP
   IF EXISTS(SELECT 1 FROM owner_advisor_business_record_digests WHERE workspace_id=w AND source_id=sid AND record_id=item->>'recordId' AND revision=item->>'revision' AND digest<>item->>'digest') THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
  END LOOP;
  vid:=gen_random_uuid();
  INSERT INTO owner_advisor_business_versions(workspace_id,source_id,version_id,owner_id,time_zone,digest,from_at,to_at,source_as_of,completeness,payload)
   VALUES(w,sid,vid,o,(SELECT time_zone FROM workspaces WHERE id=w AND active),d,(c->'input'->'window'->>'fromAt')::timestamptz,(c->'input'->'window'->>'toAt')::timestamptz,(c->'input'->>'sourceAsOf')::timestamptz,c->'input'->>'completeness',p);
  INSERT INTO owner_advisor_business_record_digests SELECT w,sid,vid,value->>'recordId',value->>'revision',value->>'digest' FROM jsonb_array_elements(rd);
 ELSIF kind='stage_coverage_map' THEN
  IF p::jsonb IS DISTINCT FROM c->'map' OR (c->'map'->>'expectedRevision')::bigint<>st.map_revision THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
  IF (SELECT count(*) FROM owner_advisor_business_versions WHERE workspace_id=w AND payload IS NOT NULL)+(SELECT count(*) FROM owner_advisor_business_maps WHERE workspace_id=w AND payload IS NOT NULL)>=200
   OR (SELECT count(*) FROM owner_advisor_business_versions WHERE workspace_id=w AND status='DRAFT')+(SELECT count(*) FROM owner_advisor_business_maps WHERE workspace_id=w AND status='DRAFT')>=20 THEN RAISE EXCEPTION 'advisor_business_limit'; END IF;
  mid:=gen_random_uuid(); INSERT INTO owner_advisor_business_maps(workspace_id,map_version_id,owner_id,digest,payload) VALUES(w,mid,o,d,p);
  UPDATE owner_advisor_business_state SET map_revision=map_revision+1 WHERE workspace_id=w RETURNING map_revision INTO rev;
 ELSIF kind IN('read_source_version','publish_source_version','discard_source_version','withdraw_source','delete_source') THEN
  sid:=(c->>'sourceId')::uuid;
  SELECT * INTO s FROM owner_advisor_business_sources WHERE workspace_id=w AND source_id=sid FOR UPDATE;
  IF NOT FOUND OR s.deleted THEN RAISE EXCEPTION 'advisor_business_forbidden'; END IF;
  vid:=(c->>'versionId')::uuid;
  IF vid IS NOT NULL THEN
   SELECT * INTO v FROM owner_advisor_business_versions WHERE workspace_id=w AND source_id=sid AND version_id=vid FOR UPDATE;
   IF NOT FOUND OR v.payload IS NULL THEN RAISE EXCEPTION 'advisor_business_forbidden'; END IF;
  END IF;
  IF kind='read_source_version' THEN
   IF (SELECT count(*) FROM owner_advisor_business_read_receipts WHERE workspace_id=w)+(SELECT count(*) FROM owner_advisor_business_inspections WHERE workspace_id=w AND expires_at>clock_timestamp())>=1000 THEN RAISE EXCEPTION 'advisor_business_limit'; END IF;
   INSERT INTO owner_advisor_business_read_receipts(workspace_id,owner_id,request_id,read_receipt_id,source_id,version_id,digest,revision,evidence_revision,authority,session_hash,context_digest,expires_at)
    VALUES(w,o,r,gen_random_uuid(),sid,vid,v.digest,s.revision,st.evidence_revision,a,session,ctx,LEAST(clock_timestamp()+interval '5 minutes',valid_until)); rev:=s.revision;
  ELSE
   IF s.revision<>(c->>'expectedRevision')::bigint OR c->>'acknowledged'<>'true' THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
   IF kind IN('publish_source_version','discard_source_version') THEN
    IF v.digest<>c->>'digest' OR v.status<>'DRAFT' OR (kind='publish_source_version' AND v.owner_id<>o) THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
   END IF;
   IF kind='publish_source_version' THEN
    SELECT * INTO rr FROM owner_advisor_business_read_receipts WHERE workspace_id=w AND owner_id=o AND read_receipt_id=(c->>'readReceiptId')::uuid;
    IF NOT FOUND OR rr.version_id IS DISTINCT FROM vid OR rr.digest<>v.digest OR rr.revision<>s.revision OR rr.authority<>a OR rr.session_hash<>session OR rr.context_digest<>ctx OR rr.expires_at<=clock_timestamp() OR rr.evidence_revision<>st.evidence_revision OR v.completeness<>'COMPLETE' OR v.time_zone<>(SELECT time_zone FROM workspaces WHERE id=w) THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
    IF EXISTS(SELECT 1 FROM owner_advisor_business_windows WHERE workspace_id=w AND source_id=sid AND from_at<v.to_at AND v.from_at<to_at AND ROW(from_at,to_at) IS DISTINCT FROM ROW(v.from_at,v.to_at)) THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
    UPDATE owner_advisor_business_versions SET status='PUBLISHED',published_at=clock_timestamp() WHERE workspace_id=w AND version_id=vid;
    INSERT INTO owner_advisor_business_windows VALUES(w,sid,v.from_at,v.to_at,vid) ON CONFLICT(workspace_id,source_id,from_at,to_at) DO UPDATE SET version_id=excluded.version_id;
    UPDATE owner_advisor_business_sources SET active=true,name=v.payload::jsonb->'source'->>'name',max_age_minutes=(v.payload::jsonb->'source'->>'maxAgeMinutes')::int WHERE workspace_id=w AND source_id=sid;
   ELSIF kind='discard_source_version' THEN
    UPDATE owner_advisor_business_versions SET status='DISCARDED',payload=NULL WHERE workspace_id=w AND version_id=vid;
    DELETE FROM owner_advisor_business_record_digests WHERE workspace_id=w AND version_id=vid;
   ELSE
    -- d is the server-recomputed bounded catalog administration digest.
    IF c->>'digest' IS DISTINCT FROM d THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
    DELETE FROM owner_advisor_business_windows WHERE workspace_id=w AND source_id=sid;
    UPDATE owner_advisor_business_sources SET active=false WHERE workspace_id=w AND source_id=sid;
    IF kind='delete_source' THEN
     UPDATE owner_advisor_business_versions SET status='ERASED',payload=NULL WHERE workspace_id=w AND source_id=sid AND status<>'ERASED';
     DELETE FROM owner_advisor_business_record_digests WHERE workspace_id=w AND source_id=sid;
     UPDATE owner_advisor_business_maps SET status='DISCARDED',payload=NULL,current=false WHERE workspace_id=w AND payload IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(payload::jsonb->'cells') x WHERE x->>'sourceId'=sid::text);
     -- Structured source-derived answers are also erased. Content-free request identity
     -- remains completed with NULL result, so the original request cannot replay or rerun.
     UPDATE owner_advisor_requests SET result=NULL WHERE workspace_id=w AND result IS NOT NULL AND (result ? 'businessEvidence' OR result ? 'businessInspectionRefs');
     UPDATE owner_advisor_business_inspections SET result=NULL,fence=NULL,context=NULL,state='expired' WHERE workspace_id=w;
     DELETE FROM owner_advisor_business_read_receipts WHERE workspace_id=w AND (source_id=sid OR map_version_id IN(SELECT map_version_id FROM owner_advisor_business_maps WHERE workspace_id=w AND payload IS NULL));
     UPDATE owner_advisor_business_sources SET deleted=true,name='',namespace='erased:'||sid::text,revision=revision+1 WHERE workspace_id=w AND source_id=sid RETURNING revision INTO rev;
    END IF;
   END IF;
   IF kind<>'delete_source' THEN UPDATE owner_advisor_business_sources SET revision=revision+1 WHERE workspace_id=w AND source_id=sid RETURNING revision INTO rev; END IF;
   IF kind<>'discard_source_version' THEN UPDATE owner_advisor_business_state SET evidence_revision=evidence_revision+1 WHERE workspace_id=w; END IF;
  END IF;
 ELSIF kind IN('read_coverage_map','publish_coverage_map','discard_coverage_map') THEN
  mid:=(c->>'mapVersionId')::uuid;
  SELECT * INTO m FROM owner_advisor_business_maps WHERE workspace_id=w AND map_version_id=mid FOR UPDATE;
  IF NOT FOUND OR m.payload IS NULL THEN RAISE EXCEPTION 'advisor_business_forbidden'; END IF;
  IF kind='read_coverage_map' THEN
   IF (SELECT count(*) FROM owner_advisor_business_read_receipts WHERE workspace_id=w)+(SELECT count(*) FROM owner_advisor_business_inspections WHERE workspace_id=w AND expires_at>clock_timestamp())>=1000 THEN RAISE EXCEPTION 'advisor_business_limit'; END IF;
   INSERT INTO owner_advisor_business_read_receipts(workspace_id,owner_id,request_id,read_receipt_id,map_version_id,digest,revision,evidence_revision,authority,session_hash,context_digest,expires_at)
    VALUES(w,o,r,gen_random_uuid(),mid,m.digest,st.map_revision,st.evidence_revision,a,session,ctx,LEAST(clock_timestamp()+interval '5 minutes',valid_until)); rev:=st.map_revision;
  ELSE
   IF m.status<>'DRAFT' OR (kind='publish_coverage_map' AND m.owner_id<>o) OR m.digest<>c->>'digest' OR st.map_revision<>(c->>'expectedRevision')::bigint OR c->>'acknowledged'<>'true' THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
   IF kind='publish_coverage_map' THEN
    SELECT * INTO rr FROM owner_advisor_business_read_receipts WHERE workspace_id=w AND owner_id=o AND read_receipt_id=(c->>'readReceiptId')::uuid;
    IF NOT FOUND OR rr.map_version_id IS DISTINCT FROM mid OR rr.digest<>m.digest OR rr.revision<>st.map_revision OR rr.evidence_revision<>st.evidence_revision OR rr.authority<>a OR rr.session_hash<>session OR rr.context_digest<>ctx OR rr.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'advisor_business_conflict'; END IF;
    UPDATE owner_advisor_business_maps SET current=false WHERE workspace_id=w AND current;
    UPDATE owner_advisor_business_maps SET current=true,status='PUBLISHED' WHERE workspace_id=w AND map_version_id=mid;
    UPDATE owner_advisor_business_state SET evidence_revision=evidence_revision+1 WHERE workspace_id=w;
   ELSE UPDATE owner_advisor_business_maps SET status='DISCARDED',payload=NULL WHERE workspace_id=w AND map_version_id=mid;
   END IF;
   UPDATE owner_advisor_business_state SET map_revision=map_revision+1 WHERE workspace_id=w RETURNING map_revision INTO rev;
  END IF;
 ELSE RAISE EXCEPTION 'advisor_business_conflict';
 END IF;
 IF kind NOT IN('read_source_version','read_coverage_map') THEN UPDATE owner_advisor_business_state SET revision=revision+1 WHERE workspace_id=w; END IF;
 saved_receipt:=jsonb_build_object('operationId',r,'kind',kind,'sourceId',sid,'versionId',vid,'mapVersionId',mid,'revision',rev,'savedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
 UPDATE owner_advisor_business_operations SET state='completed',receipt=saved_receipt WHERE workspace_id=w AND owner_id=o AND request_id=r;
 RETURN saved_receipt;
END $$;
COMMIT;
