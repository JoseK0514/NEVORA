import {expect,it} from 'vitest';
import {parseCalendarStatus,parseCalendarResult} from './contract';
const authority='a'.repeat(64),operationId='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',generation='33333333-3333-4333-8333-333333333333';
const status={state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],authority,observedAt:'2026-10-27T12:00:00Z',validForMs:45000,canIssue:true};
const command={kind:'ISSUE' as const,operationId,authority,expectedGeneration:null};
const created={status:'created',operationId,id,generation,url:`https://nevora.test/api/calendar/${'A'.repeat(43)}/schedule.ics`};
it('accepts bounded own current status and exact one-time receipts only',()=>{expect(parseCalendarStatus(status,authority)).toEqual(status);expect(parseCalendarResult(created,command,'https://nevora.test')).toEqual(created);});
it.each([{validForMs:0},{validForMs:45001},{validForMs:'45000'},{canIssue:'true'},{authority:'b'.repeat(64)},{state:'active'},{id},{issuedAt:'today'},{allowedLocationIds:['loc-1']},{observedAt:'invalid'},{peer:'extra'}])('refuses malformed/unbound current status %j',patch=>{expect(()=>parseCalendarStatus({...status,...patch},authority)).toThrow();});
it.each([{operationId:generation},{generation:'invalid'},{status:'revoked'},{status:'connected'},{url:'https://evil.test/api/calendar/'+ 'A'.repeat(43)+'/schedule.ics'},{url:created.url+'?copy=1'},{url:created.url+'#copy'},{url:created.url.replace('A/schedule','B/schedule')},{url:created.url.replace('https://','https://name:password@')},{extra:true}])('refuses stale/malformed/foreign receipt %j',patch=>{expect(()=>parseCalendarResult({...created,...patch},command,'https://nevora.test')).toThrow();});
it('binds safe lost-response recovery and revoke generation to the original request',()=>{
 expect(parseCalendarResult({status:'active_url_unavailable',operationId,id,generation},command,'https://nevora.test')).toMatchObject({status:'active_url_unavailable'});
 expect(()=>parseCalendarResult({status:'outcome_unknown',operationId:id},command,'https://nevora.test')).toThrow();
 const revoke={...command,kind:'REVOKE' as const,expectedGeneration:generation};expect(parseCalendarResult({status:'revoked',operationId,id,generation},revoke,'https://nevora.test')).toMatchObject({status:'revoked'});
 expect(()=>parseCalendarResult({status:'revoked',operationId,id,generation:id},revoke,'https://nevora.test')).toThrow();
});
