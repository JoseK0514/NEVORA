import {timingSafeEqual} from 'node:crypto';
import {decodePushKey} from './push-key';
export type NamedProtectionKey={id:string;key:Uint8Array};
export type ProtectionKeyring={active:NamedProtectionKey;previous?:NamedProtectionKey;legacyKeyId?:string};
export type PushProtection=Uint8Array|ProtectionKeyring;
export type ProtectionConfig={subscriptionEncryptionKey?:string;subscriptionEncryptionKeyId?:string;
 subscriptionPreviousEncryptionKey?:string;subscriptionPreviousEncryptionKeyId?:string;subscriptionLegacyEncryptionKeyId?:string};
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,32}$/.test(v);
const validKey=(v:unknown):v is Uint8Array=>v instanceof Uint8Array&&v.byteLength===32;
function validNamed(v:NamedProtectionKey|undefined):v is NamedProtectionKey{return !!v&&id(v.id)&&validKey(v.key);}
export function validateProtection(value:PushProtection):void{
 if(value instanceof Uint8Array){if(!validKey(value))throw Error('Invalid protection configuration');return;}
 if(!value||!validNamed(value.active)||(value.previous!==undefined&&(!validNamed(value.previous)||value.previous.id===value.active.id||timingSafeEqual(value.previous.key,value.active.key)))||
   (value.legacyKeyId!==undefined&&value.legacyKeyId!==value.active.id&&value.legacyKeyId!==value.previous?.id))throw Error('Invalid protection configuration');
}
export function activeProtection(value:PushProtection):{key:Uint8Array;id?:string}{
 validateProtection(value);return value instanceof Uint8Array?{key:value}:value.active;
}
export function readProtection(value:PushProtection,keyId?:string):Uint8Array{
 validateProtection(value);
 if(value instanceof Uint8Array){if(keyId!==undefined)throw Error('Unsupported protected key');return value;}
 const selected=keyId??value.legacyKeyId;
 if(selected===value.active.id)return value.active.key;
 if(selected!==undefined&&selected===value.previous?.id)return value.previous.key;
 throw Error('Unsupported protected key');
}
/** A maximum of two keys; no fallback guessing for unlabelled legacy material. */
export function subscriptionProtection(config:ProtectionConfig):PushProtection|null{
 const active=decodePushKey(config.subscriptionEncryptionKey,32);if(!active)return null;
 const configured=[config.subscriptionEncryptionKeyId,config.subscriptionPreviousEncryptionKey,config.subscriptionPreviousEncryptionKeyId,config.subscriptionLegacyEncryptionKeyId].some(v=>v!==undefined);
 if(!configured)return active;
 if(!id(config.subscriptionEncryptionKeyId))return null;
 const previousConfigured=config.subscriptionPreviousEncryptionKey!==undefined||config.subscriptionPreviousEncryptionKeyId!==undefined;
 const previous=decodePushKey(config.subscriptionPreviousEncryptionKey,32);
 if(previousConfigured&&(!previous||!id(config.subscriptionPreviousEncryptionKeyId)))return null;
 const value:ProtectionKeyring={active:{id:config.subscriptionEncryptionKeyId,key:active},
  ...(previousConfigured?{previous:{id:config.subscriptionPreviousEncryptionKeyId!,key:previous!}}:{}),
  ...(config.subscriptionLegacyEncryptionKeyId!==undefined?{legacyKeyId:config.subscriptionLegacyEncryptionKeyId}:{})};
 try{validateProtection(value);return value;}catch{return null;}
}
export function protectionConfigFromEnvironment(env:Record<string,string|undefined>):ProtectionConfig{
 return {subscriptionEncryptionKey:env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY,subscriptionEncryptionKeyId:env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID,
  subscriptionPreviousEncryptionKey:env.PUSH_SUBSCRIPTION_PREVIOUS_KEY,subscriptionPreviousEncryptionKeyId:env.PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID,
  subscriptionLegacyEncryptionKeyId:env.PUSH_SUBSCRIPTION_LEGACY_KEY_ID};
}
