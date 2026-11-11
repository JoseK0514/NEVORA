import {currentCalloutReleaseSql,currentShiftFingerprintSql} from '../data/shift-change-release';
/** Only an invocation-owned fictional loopback database satisfies the D04 hold. */
export function communicationDevelopmentAllowedSql(){return `inet_server_addr() IN('127.0.0.1'::inet,'::1'::inet)
 AND current_database() ~ '^(nevora_foundation_test_|nevora_exchange_test_|fuel_phase3_test_)[a-z0-9_]+$'
 AND EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database') ~ '^fuel-phase3-disposable:[a-f0-9-]{36}$')`;}
export function communicationRecipientAllowedSql(actor='$2'):string{return `EXISTS(SELECT 1 FROM employees e JOIN locations primary_l ON primary_l.id=e.primary_location_id
 JOIN locations scope_l ON scope_l.id=r.location_id AND scope_l.workspace_id=c.workspace_id AND scope_l.active
 JOIN communication_recipients g ON g.workspace_id=c.workspace_id AND g.communication_id=c.id AND g.revision_id=r.id AND g.employee_id=e.id
 WHERE e.id=${actor} AND e.active AND e.role IN('EMPLOYEE','LEAD') AND primary_l.workspace_id=c.workspace_id
 AND (e.primary_location_id=scope_l.id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=scope_l.id))
 AND (g.grant_kind='LOCATION' OR EXISTS(SELECT 1 FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id=g.source_shift_id AND sh.employee_id=e.id AND s.location_id=g.location_id AND s.status='PUBLISHED'
 AND sh.assignment_episode_id::text=g.assignment_episode_id AND ${currentShiftFingerprintSql()}=g.terms_fingerprint AND NOT EXISTS(SELECT 1 FROM shift_callouts callout WHERE ${currentCalloutReleaseSql('callout')})
 AND EXISTS(SELECT 1 FROM schedule_publication_revisions pr WHERE pr.week_start=s.week_start))))`;}

/** Closed metadata-only source check used at outbox materialization/lease time. */
export function communicationIntentAllowedSql(intent='n'){return `EXISTS(SELECT 1 FROM communications c JOIN communication_revisions r ON r.id=c.head_revision_id JOIN workspaces w ON w.id=c.workspace_id AND w.singleton AND w.active
 WHERE c.id::text=${intent}.source_id AND r.id::text=${intent}.source_version AND r.id::text=${intent}.effective_version AND c.state='PUBLISHED'
 AND (r.expires_at IS NULL OR r.expires_at>clock_timestamp()) AND ${intent}.environment='test' AND ${intent}.type='COMMUNICATION' AND (${intent}.purpose='EVENT' OR (${intent}.purpose='REMINDER' AND r.acknowledgement='REQUIRED' AND NOT EXISTS(SELECT 1 FROM communication_receipts receipt WHERE receipt.workspace_id=c.workspace_id AND receipt.communication_id=c.id AND receipt.revision_id=r.id AND receipt.employee_id=${intent}.employee_id)))
 AND ${communicationDevelopmentAllowedSql()} AND ${communicationRecipientAllowedSql(intent+'.employee_id')})`;}
