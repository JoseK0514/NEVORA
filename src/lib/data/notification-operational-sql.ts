/** Correlated stored-recipient authority, deliberately without a portal session.
 * Call only with internal SQL aliases/expressions, never request text. */
export function notificationCompanySql(employee='e'):string{
 return `EXISTS(SELECT 1 FROM locations op_home JOIN workspaces op_w ON op_w.id=op_home.workspace_id
 JOIN operational_subject_versions op_v ON op_v.workspace_id=op_w.id AND op_v.employee_id=${employee}.id
 LEFT JOIN operational_scopes_current op_g ON op_g.workspace_id=op_w.id AND op_g.employee_id=${employee}.id
 WHERE op_home.id=${employee}.primary_location_id AND op_w.singleton AND op_w.active AND ${employee}.active
 AND EXISTS(SELECT 1 FROM company_access_adoption op_a WHERE op_a.workspace_id=op_w.id AND op_a.protocol_version=1 AND op_a.state='ENFORCED' AND op_a.owner_policy_receipt_id='01a13cda-e556-7652-8469-a18a77094364')
 AND(${employee}.role='OWNER' OR(${employee}.role='MANAGER' AND op_g.role_generation=op_v.generation AND op_g.action='ASSIGN' AND op_g.mode='COMPANY' AND cardinality(op_g.location_ids)=0)))`;
}
export function notificationOperationalRecipientSql(id='$1'):string{
 return `SELECT e.id,e.role,e.active,${notificationCompanySql()} AS company,
 encode(sha256(convert_to(concat_ws(chr(31),'NEVORA notification operational authority v1',w.id,w.updated_at::text,e.id,e.role,v.generation::text,COALESCE(g.revision,0)::text),'UTF8')),'hex') AS authority
 FROM employees e JOIN locations home ON home.id=e.primary_location_id JOIN workspaces w ON w.id=home.workspace_id
 JOIN operational_subject_versions v ON v.workspace_id=w.id AND v.employee_id=e.id
 LEFT JOIN operational_scopes_current g ON g.workspace_id=w.id AND g.employee_id=e.id WHERE e.id=${id}`;
}
/** Filter before candidate limits/materialization/lease selection. Payroll and
 * self-test rows are not authorized by operational Company. Their own domain
 * validators remain mandatory before disclosure or sending. */
export function notificationOperationalAllowedSql(notification='n'):string{
 return `(${notification}.source_kind IN('SELF_TEST','PAYROLL_PREPARATION','PAYROLL_STATEMENT') OR EXISTS(SELECT 1 FROM employees op_e WHERE op_e.id=${notification}.employee_id AND op_e.active AND
 ((op_e.role IN('EMPLOYEE','LEAD') AND ${notification}.source_kind<>'MANAGER_SUMMARY' AND ${notification}.purpose<>'SUMMARY') OR ${notificationCompanySql('op_e')})))`;
}
export function notificationOperationalGuard(employeeId:string,role:string,authority:string):import('../notifications/types').SqlStatement{
 return {text:`SELECT(CASE WHEN EXISTS(SELECT 1 FROM (${notificationOperationalRecipientSql()}) access WHERE access.id=$1 AND access.role=$2 AND access.company AND access.authority=$3) THEN '1' ELSE 'notification_operational_authorization' END)::integer`,values:[employeeId,role,authority]};
}
export const isNotificationOperationalAuthorizationError=(error:unknown)=>!!(error&&typeof error==='object'&&'code'in error&&error.code==='22P02'&&'message'in error&&error.message==='invalid input syntax for type integer: "notification_operational_authorization"');
