/** A bounded keyset selector, never identity, membership or a data grant. */
export type MessageCursor={at:string;id:string};
export type MessagePage<T>={value:T;nextCursor:string|null};
export const MESSAGE_PAGE_SIZE=25;
function valid(v:unknown):v is MessageCursor{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;const c=v as Record<string,unknown>;
 if(Object.keys(c).length!==2||typeof c.at!=='string'||typeof c.id!=='string'||!/^[A-Za-z0-9_:. -]{1,200}$/.test(c.id)||c.id!==c.id.trim()||c.id.includes('..')||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(c.at))return false;
 const date=new Date(c.at);return Number.isFinite(date.getTime())&&date.toISOString().slice(0,19)===c.at.slice(0,19);
}
export function encodeMessageCursor(value:MessageCursor):string{
 if(!valid(value))throw Error('Invalid message page');return btoa(JSON.stringify({v:1,at:value.at,id:value.id})).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function parseMessageCursor(token:unknown):MessageCursor|null{
 try{
  if(typeof token!=='string'||token.length>600||!/^[A-Za-z0-9_-]+$/.test(token))return null;
  const value=JSON.parse(atob(token.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-token.length%4)%4)));
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3||value.v!==1)return null;
  const cursor={at:value.at,id:value.id};return valid(cursor)&&encodeMessageCursor(cursor)===token?cursor:null;
 }catch{return null;}
}
