import {expect,it} from 'vitest';
import {buildNotificationIntents} from '../notifications/recipients';
import {destinationForSource,safeReturnTo} from '../notifications/destinations';
import {buildPushEnvelope} from '../notifications/payloads';
import {evaluateNotificationSource} from '../data/notification-state';
import {notificationPolicyFor} from '../notifications/policy';
import type {NotificationIntent,SourceSnapshot} from '../notifications/types';
const id='12345678-1234-4234-8234-123456789abc',version='22345678-1234-4234-8234-123456789abc';
const now=new Date('2030-01-01T16:00:00Z'),policy=notificationPolicyFor('America/Puerto_Rico');
const source={kind:'COMMUNICATION',source:{kind:'COMMUNICATION',id,version},updatedAt:now.toISOString(),recipientIds:['e'],expiresAt:null} as unknown as SourceSnapshot;
const recipient={employeeId:'e',role:'EMPLOYEE' as const,active:true,allowedLocationIds:[]};
const intent={id,employeeId:'e',type:'COMMUNICATION',title:'Secret title',body:'Private body',eventKey:'stable',environment:'test',source:source.source,effectiveVersion:version,purpose:'EVENT',urgency:'normal',dueAt:now.toISOString(),expiresAt:'2030-01-02T16:00:00Z'} as NotificationIntent;
it('derives one generic event per recipient and version without actor suppression',()=>{
 const values=buildNotificationIntents({after:source,recipients:[recipient,recipient,{...recipient,employeeId:'foreign'}],actorEmployeeId:'e',environment:'test',now,policy});
 expect(values).toHaveLength(1);expect(values[0]).toMatchObject({type:'COMMUNICATION',title:'NEVORA update',body:'Open NEVORA to review an update.',actionHref:'/app/updates/'+id,purpose:'EVENT'});
 expect(buildNotificationIntents({after:source,recipients:[recipient],environment:'production',now,policy})).toEqual([]);
});
it('allows only exact update UUID paths and current immutable grants',()=>{
 expect(safeReturnTo('/app/updates/'+id)).toBe('/app/updates/'+id);
 for(const p of ['/app/updates/evil','/app/updates/'+id+'?redirect=x','/app/updates/'+id+'/edit'])expect(safeReturnTo(p)).toBeNull();
 expect(destinationForSource(source,recipient)).toBe('/app/updates/'+id);expect(destinationForSource(source,{...recipient,employeeId:'foreign'})).toBeNull();
});
it('uses generic lock-screen payload and rejects obsolete or revoked communication',()=>{
 const payload=buildPushEnvelope(intent,'generation');expect(payload.title).toBe('NEVORA update');expect(payload.body).toBe('Open NEVORA to review an update.');expect(JSON.stringify(payload)).not.toContain('Secret');
 expect(evaluateNotificationSource(intent,recipient,source,now,policy).deliverable).toBe(true);
 expect(evaluateNotificationSource({...intent,effectiveVersion:id},recipient,source,now,policy).deliverable).toBe(false);
 expect(evaluateNotificationSource(intent,{...recipient,employeeId:'foreign'},source,now,policy).deliverable).toBe(false);
});
