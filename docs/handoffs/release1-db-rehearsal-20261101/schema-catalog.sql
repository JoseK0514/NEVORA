WITH objects AS (
 SELECT 'relation' AS kind,c.relname AS name,jsonb_build_object('kind',c.relkind,'persistence',c.relpersistence,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'replicaIdentity',c.relreplident,'options',c.reloptions,'partitionKey',CASE WHEN c.relkind='p' THEN pg_get_partkeydef(c.oid) END,'partitionBound',pg_get_expr(c.relpartbound,c.oid)) AS definition
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','S','f')
 UNION ALL
 SELECT 'column',c.relname||'.'||a.attname,jsonb_build_object('ordinal',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',CASE WHEN a.attcollation<>0 THEN a.attcollation::regcollation::text END,'default',pg_get_expr(d.adbin,d.adrelid),'storage',a.attstorage,'compression',a.attcompression)
 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped AND c.relkind IN('r','p','v','m','f')
 UNION ALL
 SELECT 'constraint',c.relname||'.'||k.conname,jsonb_build_object('definition',pg_get_constraintdef(k.oid,false),'validated',k.convalidated,'deferrable',k.condeferrable,'deferred',k.condeferred)
 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 UNION ALL
 SELECT 'index',ic.relname,jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'replicaIdentity',i.indisreplident)
 FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 UNION ALL
 SELECT 'function',p.oid::regprocedure::text,jsonb_build_object('definition',pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN('f','p')
 UNION ALL
 SELECT 'trigger',c.relname||'.'||t.tgname,jsonb_build_object('definition',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
 UNION ALL
 SELECT 'view',c.relname,jsonb_build_object('definition',pg_get_viewdef(c.oid,false)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('v','m')
 UNION ALL
 SELECT 'sequence',sequencename,jsonb_build_object('type',data_type,'start',start_value,'min',min_value,'max',max_value,'increment',increment_by,'cycle',cycle,'cache',cache_size) FROM pg_sequences WHERE schemaname='public'
 UNION ALL
 SELECT 'enum',t.typname,jsonb_build_object('labels',jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.typname
 UNION ALL
 SELECT 'domain',t.typname,jsonb_build_object('base',format_type(t.typbasetype,t.typtypmod),'notNull',t.typnotnull,'default',t.typdefault) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='d'
 UNION ALL
 SELECT 'policy',c.relname||'.'||p.polname,jsonb_build_object('command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'public' ELSE pg_get_userbyid(r) END ORDER BY r) FROM unnest(p.polroles) r)) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
)
SELECT kind,name,definition FROM objects ORDER BY kind,name;
