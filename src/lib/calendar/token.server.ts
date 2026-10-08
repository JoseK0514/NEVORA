import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
export function validCalendarToken(token:unknown):token is string {
 return typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token)&&Buffer.from(token,'base64url').length===32&&Buffer.from(token,'base64url').toString('base64url')===token;
}
export const calendarDigest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function createCalendarToken(){const token=randomBytes(32).toString('base64url');return {token,digest:calendarDigest(token)};}
