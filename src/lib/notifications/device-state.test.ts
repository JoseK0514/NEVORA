import { expect, it } from 'vitest';
import { deriveDeviceState, readDismissal, saveDismissal, ownPublicationChanges } from './device-state';
const capabilities = { secure: true, serviceWorker: true, push: true, notifications: true, requiresStandalone: false, installPrompt: false };
const server = { supported: true, enabled: false, configurationAvailable: true, testAllowed: false, dismissalScope: 'opaque-scope' };
const input = { capabilities, permission: 'default' as const, standalone: false as const, server, dismissed: false };
it('instructions_do_not_claim_installed', () => {
  expect(deriveDeviceState({...input, capabilities:{...capabilities, requiresStandalone:true}})).toBe('install');
  expect(deriveDeviceState({...input, standalone:'unknown', capabilities:{...capabilities,requiresStandalone:true}})).toBe('install');
  expect(deriveDeviceState({...input, standalone:true})).toBe('ready');
});
it('denial_is_not_reprompted', () => expect(deriveDeviceState({...input,permission:'denied'})).toBe('denied'));
it('requires server consent AND matching local ownership before enabled', () => {
  expect(deriveDeviceState({...input,permission:'granted',server:{...server,enabled:true}})).toBe('pending');
  expect(deriveDeviceState({...input,permission:'granted',server:{...server,enabled:true,localOwned:true}})).toBe('enabled');
  expect(deriveDeviceState({...input,server:{...server,enabled:true}})).toBe('revoked');
});
it.each(['loading','pending','error'] as const)('preserves %s', phase => expect(deriveDeviceState({...input,server:{...server,phase}})).toBe(phase));
it('unsupported and configuration unavailable are explicit', () => {
 expect(deriveDeviceState({...input,permission:'unsupported'})).toBe('unavailable');
 expect(deriveDeviceState({...input,server:{...server,configurationAvailable:false}})).toBe('unavailable');
});
it('not_now_persists_without_nagging and is account/installation scoped', () => {
 const values = new Map<string,string>(); const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 expect(saveDismissal(storage,'opaque-scope')).toBe(true);
 expect(readDismissal(storage,'opaque-scope')).toBe(true);
 expect(readDismissal(storage,'other-account')).toBe(false);
 expect(readDismissal(storage,undefined)).toBe(false);
 expect(saveDismissal({setItem:()=>{throw Error();}},'scope')).toBe(false);
 expect(deriveDeviceState({...input,dismissed:true})).toBe('dismissed');
});
it('projects only actual own before/after shifts, including reassignment without coworker disclosure', () => {
 const own={employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false,sourceShiftId:'shift'};
 const other={...own,employeeId:'other',startTime:'13:00',notes:'private'};
 expect(ownPublicationChanges([own],[other],'self')).toEqual([{type:'REMOVED',before:own,affectedEmployeeIds:['self']}]);
 expect(ownPublicationChanges([own],[own],'self')).toEqual([]);
 expect(ownPublicationChanges([other],[other],'self')).toEqual([]);
});
