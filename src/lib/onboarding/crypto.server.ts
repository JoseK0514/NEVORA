import 'server-only';
import {createHmac,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

export function newOnboardingToken():string{return randomBytes(32).toString('base64url');}
export function validOnboardingToken(value:unknown):value is string{return typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value)&&Buffer.from(value,'base64url').length===32&&Buffer.from(value,'base64url').toString('base64url')===value;}
function secret(key:string):Buffer{if(!validOnboardingToken(key))throw Error('Invalid onboarding key configuration');return Buffer.from(key,'base64url');}
export function digestOnboardingProof(purpose:string,proof:string,key:string):string{return createHmac('sha256',secret(key)).update('NEVORA onboarding '+purpose+' v1\0').update(proof).digest('hex');}
export function sealOnboardingValue(value:string,purpose:string,key:string):string{
 if(Buffer.byteLength(value,'utf8')>65536)throw Error('Onboarding private payload is too large');
 const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret(key),nonce);cipher.setAAD(Buffer.from('NEVORA onboarding '+purpose+' v1','utf8'));
 const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return ['v1',nonce.toString('base64url'),ciphertext.toString('base64url'),cipher.getAuthTag().toString('base64url')].join('.');
}
export function openOnboardingValue(sealed:unknown,purpose:string,key:string):string|null{
 if(typeof sealed!=='string'||sealed.length>90000)return null;
 try{const p=sealed.split('.');if(p.length!==4||p[0]!=='v1'||!p.slice(1).every(x=>/^[A-Za-z0-9_-]*$/.test(x)&&Buffer.from(x,'base64url').toString('base64url')===x))return null;const nonce=Buffer.from(p[1],'base64url'),tag=Buffer.from(p[3],'base64url');if(nonce.length!==12||tag.length!==16)return null;const d=createDecipheriv('aes-256-gcm',secret(key),nonce);d.setAAD(Buffer.from('NEVORA onboarding '+purpose+' v1','utf8'));d.setAuthTag(tag);return Buffer.concat([d.update(Buffer.from(p[2],'base64url')),d.final()]).toString('utf8');}catch{return null;}
}
