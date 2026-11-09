/** Fixed internal aliases, never user input. The field order matches materialShiftTerms. */
function fields(shift:string,schedule:string):[string,string][] {
 return [['shiftId',`${shift}.id`],['scheduleId',`${schedule}.id`],['workspaceId',`(SELECT workspace_id FROM locations WHERE id=${schedule}.location_id)`],['timeZone','(SELECT time_zone FROM workspaces WHERE singleton)'],['weekStart',`${schedule}.week_start::text`],['date',`${shift}.date::text`],['startTime',`left(${shift}.start_time::text,5)`],['endTime',`left(${shift}.end_time::text,5)`],['locationId',`${schedule}.location_id`],['employeeId',`${shift}.employee_id`],['assignmentEpisodeId',`${shift}.assignment_episode_id::text`],['termsRevision',`${shift}.terms_revision`],['positionId',`${shift}.position_id`],['isDesignatedLead',`${shift}.is_designated_lead`],['scheduledBreaks',`'{"status":"UNKNOWN"}'::jsonb`]];
}
export function currentShiftTermsSql(shift='sh',schedule='s'):string {
 return `jsonb_build_object(${fields(shift,schedule).map(([k,v])=>`'${k}',${v}`).join(',')})`;
}
export function currentShiftFingerprintSql(shift='sh',schedule='s'):string {
 // Encode individual scalars rather than stripping whitespace from JSON text:
 // IDs containing spaces, quotes or commas retain their exact reviewed value.
 const parts=fields(shift,schedule).map(([k,v])=>`'"${k}":',${k==='scheduledBreaks'?`'{"status":"UNKNOWN"}'`:`COALESCE(to_jsonb(${v})::text,'null')`}`);
 return `'v1:'||encode(sha256(convert_to(concat('{',${parts.join(",',',")},'}'),'UTF8')),'hex')`;
}
/** Shared release predicate: approved status alone cannot release a different assignment episode or changed material terms. */
export function currentCalloutReleaseSql(callout='c',shift='sh',schedule='s'):string {
 return `${callout}.status='APPROVED' AND ${callout}.shift_id=${shift}.id AND ${callout}.employee_id=${shift}.employee_id AND ${callout}.assignment_episode_id=${shift}.assignment_episode_id AND ${callout}.reviewed_terms_fingerprint=${currentShiftFingerprintSql(shift,schedule)} AND ${callout}.source_terms=${currentShiftTermsSql(shift,schedule)}`;
}
