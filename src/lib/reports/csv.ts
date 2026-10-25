import type {PeriodReports} from './project';
/** Quoted RFC-style fields; protect text even after leading control/space characters. */
export function csvCell(value:unknown):string{
 const text=value===null||value===undefined?'':String(value);
 const safe=/^[\s\uFEFF]*[=+@-]/u.test(text)?`'${text}`:text;
 return `"${safe.replaceAll('"','""')}"`;
}
export function csvDocument(rows:readonly (readonly unknown[])[]):string{return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
/** Serialize the observed report with BOM, exact nanosecond columns and explicit
 * unavailable/definition rows. Keep source provenance and formula-safe cell escaping
 * when adding categories so a spreadsheet cannot silently reinterpret source text. */
export function reportCsv(r:PeriodReports):string{
 const rows:unknown[][]=[['model_version','workspace_id','period_start','period_end','time_zone','observed_at','category','record_id','employee_id','label','recorded_nanoseconds','break_nanoseconds','scheduled_nanoseconds','difference_nanoseconds','state','revision','source_hash','start_at','end_at','detail']];
 const scope=[1,r.workspaceId,r.period.startDate,r.period.endDate,r.timeZone,r.observedAt];
 const add=(category:string,id:string,employeeId:string,label:string,recorded:string|null='',breaks:string|null='',scheduled:string|null='',difference:string|null='',state='',revision:number|string='',hash='',start='',end='',detail='')=>rows.push([...scope,category,id,employeeId,label,recorded,breaks,scheduled,difference,state,revision,hash,start,end,detail]);
 add('summary','','','Recorded period',r.summary.recordedNanoseconds,r.summary.breakNanoseconds,'','','verified','','','','',`${r.summary.employeeCount} timecards; ${r.summary.entryCount} effective entries. Recorded time includes breaks.`);
 for(const [category,items] of [['employee',r.hoursByEmployee],['location',r.hoursByLocation],['position',r.hoursByPosition]] as const)for(const row of items)add(category,row.id,category==='employee'?row.id:'',row.name,row.recordedNanoseconds,row.breakNanoseconds);
 for(const row of r.scheduleVsActual)add('schedule_vs_actual',row.employeeId,row.employeeId,row.employeeName,row.recordedNanoseconds,'',row.scheduledNanoseconds,row.differenceNanoseconds,row.scheduledNanoseconds===null?'unavailable':'verified');
 for(const row of r.approvals)add('approval',row.employeeId,row.employeeId,row.employeeName,'','','','',row.state,row.revision,row.sourceHash,'','',`${row.issueCount} review flags`);
 for(const c of r.cards)for(const e of c.card.entries){add('effective_entry',e.id,c.card.employeeId,c.card.employeeName,'','','','',e.sourceKind,c.revision,c.sourceHash,e.startAt,e.endAt??'',`${e.locationName}; position: ${e.positionName??'not captured'}; adjustment: ${e.adjustmentId??'none'}`);for(const b of e.breaks)add('effective_break',b.id,c.card.employeeId,b.name,'','','','',b.adjustmentId?'ADJUSTMENT':'RECORDED',c.revision,c.sourceHash,b.startAt,b.endAt??'');}
 for(const g of r.attendance.groups)for(const o of g.observations)add('attendance',o.id,g.employeeId,o.kind,'','','','',r.attendance.state,g.sourceVersion,'','','',o.message);
 for(const l of r.attendance.limitations)add('attendance_limitation',l.entryId,'',l.reason,'','','','', 'unavailable','','','','',l.breakId??'');
 for(const id of r.attendance.unavailableEmployeeIds)add('attendance_source',id,id,'Source unavailable','','','','','unavailable');
 for(const row of [...r.callouts,...r.timeOff])add(row.kind.toLowerCase(),row.id,row.employeeId,row.employeeName,'','','','',row.status,'','',row.date,row.endDate);
 for(const row of r.shiftChanges)add('shift_change',row.id,row.employeeId,row.requestKind,'','','','',row.eventKind,row.requestRevision,'',row.sourceDate,'',`${row.kind}; request: ${row.requestId}; outcome: ${row.outcomeMode??'unavailable'}`);
 add('overtime','','','Overtime','','','','','unavailable','','','','',r.overtime.reason);
 add('coverage','','','Coverage outcomes','','','','','recorded','','','','',`${r.coverageReliability.completedCoverageRequests}/${r.coverageReliability.observedCoverageRequests}; ${r.coverageReliability.definition}`);
 add('stability','','','Publication revisions','','','','','recorded',r.scheduleStability.revisionCount,'','','',r.scheduleStability.definition);
 r.definitions.forEach((d,i)=>add('definition',String(i+1),'','Definition','','','','','recorded','','','','',d));
 return '\uFEFF'+csvDocument(rows);
}
