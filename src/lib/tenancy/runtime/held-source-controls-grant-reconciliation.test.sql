-- Fixed INTERNAL comparison only, after two original genuine held-source reads.
-- $1/$2 full native JSONB text; $3 reader OID; $4 original installer OID;
-- $5/$6 exact reader/installer names; $7 independently observed original root
-- OID; $8 the full protected root body from the fixed producer source preimage.
-- These are private producer facts, not caller JSON authenticated by shape.
-- Preserve all native values, including positive int8 beyond JS-safe precision.
-- Only the native schema ACL representation is compared as complete expanded
-- tuples with the exact installer-intended nongrantable reader USAGE addition.
WITH parameters AS (
 SELECT $1::pg_catalog.text::pg_catalog.jsonb AS before_snapshot,$2::pg_catalog.text::pg_catalog.jsonb AS after_snapshot,
  CASE WHEN $3::pg_catalog.text ~ '^[1-9][0-9]{0,9}$' THEN CASE WHEN $3::pg_catalog.text::pg_catalog.numeric<=4294967295::pg_catalog.numeric THEN $3::pg_catalog.text::pg_catalog.oid ELSE NULL::pg_catalog.oid END ELSE NULL::pg_catalog.oid END AS reader_oid,CASE WHEN $4::pg_catalog.text ~ '^[1-9][0-9]{0,9}$' THEN CASE WHEN $4::pg_catalog.text::pg_catalog.numeric<=4294967295::pg_catalog.numeric THEN $4::pg_catalog.text::pg_catalog.oid ELSE NULL::pg_catalog.oid END ELSE NULL::pg_catalog.oid END AS installer_oid,
  $5::pg_catalog.text AS reader_name,$6::pg_catalog.text AS installer_name,
  CASE WHEN $7::pg_catalog.text ~ '^[1-9][0-9]{0,9}$' THEN CASE WHEN $7::pg_catalog.text::pg_catalog.numeric<=4294967295::pg_catalog.numeric THEN $7::pg_catalog.text::pg_catalog.oid ELSE NULL::pg_catalog.oid END ELSE NULL::pg_catalog.oid END AS root_oid,$8::pg_catalog.text AS expected_root_body
), bound_identity AS (
 SELECT parameters.*,n.oid AS schema_oid,n.nspowner AS schema_owner_oid
 FROM parameters
 JOIN pg_catalog.pg_namespace AS n ON n.nspname='nevora_tenancy'
 JOIN pg_catalog.pg_roles AS installer ON installer.oid=parameters.installer_oid
  AND installer.rolname::pg_catalog.text COLLATE pg_catalog."C"=parameters.installer_name COLLATE pg_catalog."C"
 JOIN pg_catalog.pg_roles AS reader ON reader.oid=parameters.reader_oid
  AND reader.rolname::pg_catalog.text COLLATE pg_catalog."C"=parameters.reader_name COLLATE pg_catalog."C"
 JOIN pg_catalog.pg_proc AS root ON root.oid=parameters.root_oid AND root.pronamespace=n.oid
  AND root.proname='resolve_portal' AND root.proowner=reader.oid
 JOIN pg_catalog.pg_language AS language ON language.oid=root.prolang
 WHERE $3::pg_catalog.text=parameters.reader_oid::pg_catalog.text
  AND $4::pg_catalog.text=parameters.installer_oid::pg_catalog.text
  AND $7::pg_catalog.text=parameters.root_oid::pg_catalog.text
  AND parameters.reader_oid<>parameters.installer_oid
  AND n.nspowner=installer.oid AND installer.rolcanlogin
  AND session_user::pg_catalog.text COLLATE pg_catalog."C"=parameters.installer_name COLLATE pg_catalog."C"
  AND current_user::pg_catalog.text COLLATE pg_catalog."C"=parameters.installer_name COLLATE pg_catalog."C"
  AND pg_catalog.current_setting('role')='none'
  AND (SELECT activity.usesysid FROM pg_catalog.pg_stat_activity AS activity
       WHERE activity.pid=pg_catalog.pg_backend_pid())=installer.oid
  AND NOT reader.rolcanlogin AND NOT reader.rolsuper AND NOT reader.rolbypassrls
  AND NOT reader.rolcreaterole AND NOT reader.rolcreatedb AND NOT reader.rolreplication AND NOT reader.rolinherit
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members AS membership
       WHERE membership.member=reader.oid OR membership.roleid=reader.oid OR membership.grantor=reader.oid)
  AND root.prosrc COLLATE pg_catalog."C"=parameters.expected_root_body COLLATE pg_catalog."C"
  AND language.lanname='plpgsql' AND root.prokind='f' AND root.prosecdef AND NOT root.proretset
  AND root.prorettype=3802 AND root.proargtypes::pg_catalog.oid[]=('25 25'::pg_catalog.oidvector)::pg_catalog.oid[]
  AND root.provolatile='v' AND root.proparallel='u' AND NOT root.proisstrict AND NOT root.proleakproof
  AND root.prosupport=0 AND root.probin IS NULL AND root.provariadic=0 AND root.pronargdefaults=0
  AND root.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[]
  AND (SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc AS sibling
       WHERE sibling.pronamespace=n.oid AND sibling.proname='resolve_portal')=1
), snapshot_rows AS (
 SELECT bound.*,snapshot.side,snapshot.value AS full_snapshot
 FROM bound_identity AS bound
 CROSS JOIN LATERAL (VALUES ('BEFORE'::pg_catalog.text,bound.before_snapshot),
                           ('AFTER'::pg_catalog.text,bound.after_snapshot)) AS snapshot(side,value)
 WHERE pg_catalog.jsonb_typeof(snapshot.value)='object'
  AND snapshot.value::pg_catalog.text COLLATE pg_catalog."C"=
      CASE snapshot.side WHEN 'BEFORE' THEN $1::pg_catalog.text ELSE $2::pg_catalog.text END COLLATE pg_catalog."C"
  AND ARRAY(SELECT key FROM pg_catalog.jsonb_object_keys(CASE WHEN pg_catalog.jsonb_typeof(snapshot.value)='object'
       THEN snapshot.value ELSE '{}'::pg_catalog.jsonb END) AS keys(key)
       ORDER BY key COLLATE pg_catalog."C")=ARRAY['catalog','contracts','format','protocol']::pg_catalog.text[]
  AND snapshot.value->>'format'='PORTAL_INSTALLER_HELD_SOURCE_CONTROLS_V1'
  AND pg_catalog.jsonb_typeof(snapshot.value->'catalog')='array'
  AND CASE WHEN pg_catalog.jsonb_typeof(snapshot.value->'catalog')='array'
       THEN pg_catalog.jsonb_array_length(snapshot.value->'catalog')=2 ELSE false END
  AND pg_catalog.jsonb_typeof(snapshot.value->'protocol')='object'
  AND ARRAY(SELECT key FROM pg_catalog.jsonb_object_keys(CASE
       WHEN pg_catalog.jsonb_typeof(snapshot.value->'protocol')='object' THEN snapshot.value->'protocol'
       ELSE '{}'::pg_catalog.jsonb END) AS keys(key) ORDER BY key COLLATE pg_catalog."C")=
      ARRAY['backfill_actor','capture_manifest_sha256','fence_generation','migration_id','phase','registry_sha256','schema_source_commit']::pg_catalog.text[]
  AND pg_catalog.jsonb_typeof(snapshot.value->'protocol'->'migration_id')='number'
  AND snapshot.value->'protocol'->>'migration_id'='26'
  AND pg_catalog.jsonb_typeof(snapshot.value->'protocol'->'fence_generation')='number'
  AND snapshot.value->'protocol'->>'fence_generation' ~ '^(0|[1-9][0-9]{0,18})$'
  AND CASE WHEN snapshot.value->'protocol'->>'fence_generation' ~ '^(0|[1-9][0-9]{0,18})$'
       THEN (snapshot.value->'protocol'->>'fence_generation')::pg_catalog.numeric<=9223372036854775807::pg_catalog.numeric
       ELSE false END
  AND pg_catalog.jsonb_typeof(snapshot.value->'protocol'->'phase')='string'
  AND snapshot.value->'protocol'->>'phase' IN ('EXPANDED_LEGACY','FENCED')
  AND snapshot.value->'protocol'->'backfill_actor'='null'::pg_catalog.jsonb
  AND (snapshot.value->'protocol'->'capture_manifest_sha256'='null'::pg_catalog.jsonb OR
       (pg_catalog.jsonb_typeof(snapshot.value->'protocol'->'capture_manifest_sha256')='string'
        AND snapshot.value->'protocol'->>'capture_manifest_sha256' ~ '^[a-f0-9]{64}$'))
  AND (snapshot.value->'protocol'->>'phase'<>'EXPANDED_LEGACY' OR
       snapshot.value->'protocol'->'capture_manifest_sha256'='null'::pg_catalog.jsonb)
  AND snapshot.value->'protocol'->>'schema_source_commit'='7c628e374f03c9025b2c0cfd3568be033f07238d'
  AND snapshot.value->'protocol'->>'registry_sha256'='5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681'
  AND pg_catalog.jsonb_typeof(snapshot.value->'contracts')='array'
  AND CASE WHEN pg_catalog.jsonb_typeof(snapshot.value->'contracts')='array'
       THEN pg_catalog.jsonb_array_length(snapshot.value->'contracts')=4 ELSE false END
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(CASE
       WHEN pg_catalog.jsonb_typeof(snapshot.value->'contracts')='array' THEN snapshot.value->'contracts'
       ELSE '[]'::pg_catalog.jsonb END) WITH ORDINALITY AS contract(value,position)
       WHERE pg_catalog.jsonb_typeof(contract.value)<>'object'
        OR ARRAY(SELECT key FROM pg_catalog.jsonb_object_keys(CASE
             WHEN pg_catalog.jsonb_typeof(contract.value)='object' THEN contract.value ELSE '{}'::pg_catalog.jsonb END)
             AS keys(key) ORDER BY key COLLATE pg_catalog."C") IS DISTINCT FROM
           ARRAY['anchor','mirror_columns','original_columns','primary_key_columns','sidecar_name','source_line','source_path','storage','table_name']::pg_catalog.text[]
        OR contract.value->>'table_name' IS DISTINCT FROM CASE contract.position
             WHEN 1 THEN 'employee_location_eligibility' WHEN 2 THEN 'employees' WHEN 3 THEN 'locations' WHEN 4 THEN 'workspaces' END
        OR pg_catalog.jsonb_typeof(contract.value->'source_line') IS DISTINCT FROM 'number'
        OR NOT CASE WHEN contract.value->>'source_line' ~ '^[1-9][0-9]{0,9}$'
             THEN (contract.value->>'source_line')::pg_catalog.numeric<=2147483647::pg_catalog.numeric ELSE false END)
), catalog_rows AS (
 SELECT snapshot.*,entry.position,entry.observation
 FROM snapshot_rows AS snapshot
 CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(snapshot.full_snapshot->'catalog')='array'
       THEN snapshot.full_snapshot->'catalog' ELSE '[]'::pg_catalog.jsonb END)
  WITH ORDINALITY AS entry(observation,position)
 WHERE pg_catalog.jsonb_typeof(entry.observation)='object'
  AND pg_catalog.jsonb_typeof(entry.observation->'schema')='object'
  AND entry.observation->'schema' ? 'nspacl'
  AND pg_catalog.jsonb_typeof(entry.observation->'schema'->'nspacl') IN ('array','null')
  AND entry.observation->'schema'->>'nspname'='nevora_tenancy'
  AND (entry.observation->'schema'->>'oid')::pg_catalog.oid=snapshot.schema_oid
  AND (entry.observation->'schema'->>'nspowner')::pg_catalog.oid=snapshot.installer_oid
  AND pg_catalog.jsonb_typeof(entry.observation->'relation')='object'
  AND entry.observation->'relation'->>'relname'=CASE entry.position
       WHEN 1 THEN 'expansion_protocol' WHEN 2 THEN 'owned_table_contract' END
  AND (entry.observation->'relation'->>'relnamespace')::pg_catalog.oid=snapshot.schema_oid
  AND (entry.observation->'relation'->>'relowner')::pg_catalog.oid=snapshot.installer_oid
  AND (entry.observation->'relation'->>'oid')::pg_catalog.oid=(
       SELECT relation.oid FROM pg_catalog.pg_class AS relation
       WHERE relation.relnamespace=snapshot.schema_oid
        AND relation.relname::pg_catalog.text=entry.observation->'relation'->>'relname')
), native_acl_rows AS (
 SELECT catalog.side,catalog.position,acl.grantor,acl.grantee,acl.privilege_type,acl.is_grantable
 FROM catalog_rows AS catalog
 CROSS JOIN LATERAL pg_catalog.aclexplode(CASE
  WHEN catalog.observation->'schema'->'nspacl'='null'::pg_catalog.jsonb
   THEN pg_catalog.acldefault('n'::pg_catalog."char",catalog.schema_owner_oid)
  ELSE ARRAY(SELECT (item.value #>> '{}')::pg_catalog.aclitem
       FROM pg_catalog.jsonb_array_elements(catalog.observation->'schema'->'nspacl')
       WITH ORDINALITY AS item(value,position) ORDER BY item.position) END) AS acl
), normalized_acl_rows AS (
 SELECT * FROM native_acl_rows
 UNION ALL
 SELECT 'BEFORE'::pg_catalog.text,catalog.position,catalog.installer_oid,catalog.reader_oid,
  'USAGE'::pg_catalog.text,false
 FROM catalog_rows AS catalog WHERE catalog.side='BEFORE'
  AND NOT EXISTS(SELECT 1 FROM native_acl_rows AS before_acl
       WHERE before_acl.side='BEFORE' AND before_acl.position=catalog.position
        AND before_acl.grantor=catalog.installer_oid AND before_acl.grantee=catalog.reader_oid
        AND before_acl.privilege_type='USAGE' AND NOT before_acl.is_grantable)
), normalized_catalog AS (
 SELECT catalog.side,catalog.position,
  pg_catalog.jsonb_set(catalog.observation,'{schema,nspacl}',COALESCE((
   SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'grantorOid',acl.grantor::pg_catalog.text,'granteeOid',acl.grantee::pg_catalog.text,
    'privilege',acl.privilege_type,'isGrantable',acl.is_grantable)
    ORDER BY acl.grantee,acl.grantor,acl.privilege_type COLLATE pg_catalog."C",acl.is_grantable)
   FROM normalized_acl_rows AS acl WHERE acl.side=catalog.side AND acl.position=catalog.position
  ),'[]'::pg_catalog.jsonb),false) AS observation
 FROM catalog_rows AS catalog
), normalized_snapshot AS (
 SELECT snapshot.side,pg_catalog.jsonb_set(snapshot.full_snapshot,'{catalog}',
  (SELECT pg_catalog.jsonb_agg(catalog.observation ORDER BY catalog.position)
   FROM normalized_catalog AS catalog WHERE catalog.side=snapshot.side),false) AS observation
 FROM snapshot_rows AS snapshot
)
SELECT COALESCE((SELECT before_normalized.observation=after_normalized.observation
 FROM normalized_snapshot AS before_normalized CROSS JOIN normalized_snapshot AS after_normalized
 WHERE before_normalized.side='BEFORE' AND after_normalized.side='AFTER'
  AND (SELECT pg_catalog.count(*) FROM catalog_rows WHERE side='BEFORE')=2
  AND (SELECT pg_catalog.count(*) FROM catalog_rows WHERE side='AFTER')=2
  AND NOT EXISTS(SELECT 1 FROM catalog_rows AS first_copy JOIN catalog_rows AS second_copy
       ON second_copy.side=first_copy.side AND second_copy.position<>first_copy.position
       WHERE first_copy.observation->'schema' IS DISTINCT FROM second_copy.observation->'schema')
),false) AS source_controls_match;
