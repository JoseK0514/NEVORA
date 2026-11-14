import {Temporal} from '@js-temporal/polyfill';
import type {ManagementCloseCommand} from './contracts';

const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>0&&value.length<=max&&value===value.trim()&&!/[\p{Cc}\p{Cf}]/u.test(value);

/** Actor/workspace are server-derived; a timestamp without an offset is never a closing instant. */
export function parseManagementCloseCommand(input: unknown): ManagementCloseCommand {
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid management close command');
  const value=input as Record<string,unknown>;
  const keys=['operationId','timeEntryId','expectedSourceHash','closedAt','reason'];
  if(Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key))||
    !text(value.operationId,36)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.operationId)||
    !text(value.timeEntryId,200)||!text(value.expectedSourceHash,32)||!/^[a-f0-9]{32}$/.test(value.expectedSourceHash)||
    !text(value.closedAt,100)||!/^\d{4}-\d{2}-\d{2}T/.test(value.closedAt)||!text(value.reason,500))throw Error('Invalid management close command');
  const instant=Temporal.Instant.from(value.closedAt);
  if(instant.epochNanoseconds%BigInt(1000)!==BigInt(0))throw Error('Closing instant exceeds database precision');
  return {operationId:value.operationId.toLowerCase(),timeEntryId:value.timeEntryId,expectedSourceHash:value.expectedSourceHash,closedAt:instant.toString(),reason:value.reason};
}
