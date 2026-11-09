BEGIN;
ALTER TABLE owner_advisor_requests DROP CONSTRAINT owner_advisor_requests_kind_check;
ALTER TABLE owner_advisor_requests ADD CONSTRAINT owner_advisor_requests_kind_check CHECK(kind IN('ask','save_priorities','review_briefing'));
CREATE TABLE owner_advisor_briefing_reviews (
 workspace_id text NOT NULL REFERENCES workspaces(id), owner_id text NOT NULL REFERENCES employees(id),
 issue_id text NOT NULL CHECK(issue_id ~ '^[a-f0-9]{64}$'), fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
 issue_date date NOT NULL, kind text NOT NULL CHECK(kind IN('clock_in','coverage','missing_punches','setup')),
 location_id text NOT NULL REFERENCES locations(id), proof jsonb NOT NULL CHECK(jsonb_typeof(proof)='array' AND jsonb_array_length(proof) BETWEEN 1 AND 10000 AND octet_length(proof::text)<=100000),
 disposition text NOT NULL CHECK(disposition IN('tracking','deferred','dismissed')), deferred_until timestamptz,
 revision integer NOT NULL CHECK(revision>0), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,owner_id,issue_id),
 CHECK((disposition='deferred')=(deferred_until IS NOT NULL))
);
CREATE FUNCTION owner_advisor_review_briefing(w text,o text,r uuid,h text,i text,f text,d date,k text,l text,p jsonb,expected integer,choice text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior owner_advisor_requests; current_revision integer; answer jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('owner-advisor:'||w,0));
 SELECT * INTO prior FROM owner_advisor_requests WHERE workspace_id=w AND owner_id=o AND request_id=r;
 IF FOUND THEN
  IF prior.command_hash<>h OR prior.kind<>'review_briefing' THEN RETURN jsonb_build_object('error','conflict'); END IF;
  RETURN prior.result;
 END IF;
 DELETE FROM owner_advisor_briefing_reviews WHERE workspace_id=w AND owner_id=o AND issue_date<d-14;
 DELETE FROM owner_advisor_requests WHERE workspace_id=w AND owner_id=o AND kind='review_briefing' AND created_at<clock_timestamp()-interval '14 days';
 SELECT revision INTO current_revision FROM owner_advisor_briefing_reviews WHERE workspace_id=w AND owner_id=o AND issue_id=i FOR UPDATE;
 IF COALESCE(current_revision,0)<>expected THEN RETURN jsonb_build_object('error','conflict'); END IF;
 IF current_revision IS NULL THEN
  DELETE FROM owner_advisor_briefing_reviews WHERE workspace_id=w AND owner_id=o AND issue_id IN(
   SELECT issue_id FROM owner_advisor_briefing_reviews WHERE workspace_id=w AND owner_id=o ORDER BY updated_at DESC,issue_id OFFSET 49);
 END IF;
 INSERT INTO owner_advisor_briefing_reviews(workspace_id,owner_id,issue_id,fingerprint,issue_date,kind,location_id,proof,disposition,deferred_until,revision)
 VALUES(w,o,i,f,d,k,l,p,choice,CASE WHEN choice='deferred' THEN clock_timestamp()+interval '1 hour' ELSE NULL END,1)
 ON CONFLICT(workspace_id,owner_id,issue_id) DO UPDATE SET fingerprint=EXCLUDED.fingerprint,proof=EXCLUDED.proof,disposition=EXCLUDED.disposition,deferred_until=EXCLUDED.deferred_until,revision=owner_advisor_briefing_reviews.revision+1,updated_at=clock_timestamp()
 RETURNING jsonb_build_object('revision',revision) INTO answer;
 INSERT INTO owner_advisor_requests(workspace_id,owner_id,request_id,command_hash,kind,state,result) VALUES(w,o,r,h,'review_briefing','completed',answer);
 RETURN answer;
END $$;
COMMIT;
