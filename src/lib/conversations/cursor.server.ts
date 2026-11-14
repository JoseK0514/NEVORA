import 'server-only';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {record,exact} from './model';
import type {Access} from './access.server';
/** Database-owned random secret survives server replacement; private stream order never goes in plaintext. */
export function sealCursor(a:Access,resource:string,value:Record<string,unknown>):string{
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(a.key,'hex'),iv);cipher.setAAD(Buffer.from(a.workspace.id+':'+a.signature+':'+resource));
 const encrypted=Buffer.concat([cipher.update(JSON.stringify({expires:Date.now()+300000,value})),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
export function openCursor(a:Access,resource:string,token:string|null):Record<string,unknown>|null{
 if(token===null)return null;
 try{const buf=Buffer.from(token,'base64url');if(buf.toString('base64url')!==token||buf.length<29)throw Error();const cipher=createDecipheriv('aes-256-gcm',Buffer.from(a.key,'hex'),buf.subarray(0,12));cipher.setAAD(Buffer.from(a.workspace.id+':'+a.signature+':'+resource));cipher.setAuthTag(buf.subarray(12,28));const v:unknown=JSON.parse(Buffer.concat([cipher.update(buf.subarray(28)),cipher.final()]).toString());if(!record(v)||!exact(v,['expires','value'])||typeof v.expires!=='number'||v.expires<Date.now()||v.expires>Date.now()+300001||!record(v.value))throw Error();return v.value;}catch{throw Error('conversation_cursor_invalid');}
}
