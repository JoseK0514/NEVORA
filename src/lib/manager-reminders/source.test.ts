import {expect,it} from 'vitest';
import {evaluateNotificationSource} from '../data/notification-state';
import {DEFAULT_NOTIFICATION_POLICY} from '../notifications/policy';
import type {SourceSnapshot} from '../notifications/types';
import {planManagerReminder} from './plan';
const now=new Date('2026-11-10T15:00:00Z');
const intent=planManagerReminder({kind:'COMMUNICATION',id:'11111111-1111-4111-8111-111111111111',version:'revision',employeeId:'employee',expiresAt:'2026-11-20T15:00:00Z'},now,'America/Puerto_Rico')!;
const recipient={employeeId:'employee',role:'EMPLOYEE' as const,active:true,allowedLocationIds:['loc-1']};
const source={kind:'COMMUNICATION',source:{kind:'COMMUNICATION',id:'11111111-1111-4111-8111-111111111111',version:'revision'},updatedAt:now.toISOString(),recipientIds:['employee'],missingAcknowledgementRecipientIds:['employee'],expiresAt:null} as SourceSnapshot;
it('delivers current required unacknowledged reminders',()=>{expect(evaluateNotificationSource(intent,recipient,source,now,DEFAULT_NOTIFICATION_POLICY).deliverable).toBe(true);});
it('suppresses reminders after acknowledgement while preserving ordinary event access',()=>{
 const resolved={...source,missingAcknowledgementRecipientIds:[]} as SourceSnapshot;
 expect(evaluateNotificationSource(intent,recipient,resolved,now,DEFAULT_NOTIFICATION_POLICY).deliverable).toBe(false);
 expect(evaluateNotificationSource({...intent,purpose:'EVENT'},recipient,resolved,now,DEFAULT_NOTIFICATION_POLICY).deliverable).toBe(true);
});
it('builds a privacy-safe payload for an eligible communication reminder',async()=>{
 const {buildPushEnvelope}=await import('../notifications/payloads');
 const payload=buildPushEnvelope({...intent,title:'Private person',body:'Private team details'},'generation');
 expect(payload).toMatchObject({kind:'COMMUNICATION',title:'New team update',body:'Open NEVORA to read it.'});
 expect(JSON.stringify(payload)).not.toContain('Private');
});
