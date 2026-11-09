import type {DeviceStatus} from './types';
export type BoundDeviceStatus=DeviceStatus&{authority:string;validForMs:number};
export class DeviceRequestError extends Error{constructor(readonly status:number,readonly code:string){super('Device request unavailable');}}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const fields=['supported','enabled','configurationAvailable','testAllowed','ownershipGeneration','vapidPublicKey','dismissalScope'];
function status(value:unknown,leased:boolean):DeviceStatus{
 if(!record(value)||Object.keys(value).some(key=>![...fields,...(leased?['authority','validForMs']:[])].includes(key))||['supported','enabled','configurationAvailable','testAllowed'].some(key=>typeof value[key]!=='boolean'))throw Error('Invalid device projection');
 for(const key of ['ownershipGeneration','vapidPublicKey','dismissalScope'])if(key in value&&(typeof value[key]!=='string'||!value[key]||value[key].length>256||/[\s\u0000-\u001f\u007f]/.test(value[key])))throw Error('Invalid device metadata');
 if(value.enabled&&(!value.supported||!value.configurationAvailable||!value.ownershipGeneration)||value.testAllowed&&!value.enabled||value.configurationAvailable&&!value.vapidPublicKey)throw Error('Incoherent device ownership');
 return value as unknown as DeviceStatus;
}
export function parseDeviceStatus(value:unknown,authority:string):BoundDeviceStatus{
 status(value,true);
 const v=value as Record<string,unknown>;
 if(v.authority!==authority||typeof v.validForMs!=='number'||!Number.isInteger(v.validForMs)||v.validForMs<=0||v.validForMs>45000)throw Error('Invalid device lifetime');
 return value as BoundDeviceStatus;
}
export function parseDeviceEnrollment(value:unknown):DeviceStatus{
 const result=status(value,false);if(!result.enabled||!result.ownershipGeneration)throw Error('Enrollment incomplete');return result;
}
export function parseDeviceReceipt(value:unknown,operation:'unsubscribe'|'test',generation:string|undefined,httpStatus:number):void{
 if(!record(value))throw Error('Invalid device receipt');
 if(operation==='test'){
  if(httpStatus!==202||Object.keys(value).join(',')!=='status'||value.status!=='queued')throw Error('Test result not confirmed');return;
 }
 const expected=generation?['generation','status']:['status'];
 if(httpStatus!==200||Object.keys(value).sort().join(',')!==expected.sort().join(',')||value.status!=='complete'||generation&&value.generation!==generation)throw Error('Cleanup not confirmed');
}
