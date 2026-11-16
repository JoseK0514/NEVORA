import type {Period} from '../timecards/project';
export type EventKey={at:string;id:string};
export type HistoryCursor={v:1;workspaceId:string;period:Period;upper:EventKey;after:EventKey};
const key=(v:unknown):v is EventKey=>{
 if(!v||typeof v!=='object')return false;
 const k=v as EventKey;
 return typeof k.at==='string'&&k.at.length<=40&&/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00(?::00)?)$/.test(k.at)&&Number.isFinite(Date.parse(k.at))&&typeof k.id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(k.id);
};
export function decodeHistoryCursor(value:unknown,workspaceId:string,period:Period):HistoryCursor|null{
 if(value===undefined||value===null)return null;
 try{
  if(typeof value!=='string'||value.length>2048||!/^[A-Za-z0-9_-]+$/.test(value))throw Error();
  const c=JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as HistoryCursor;
  if(c.v!==1||c.workspaceId!==workspaceId||c.period?.startDate!==period.startDate||c.period?.endDate!==period.endDate||!key(c.upper)||!key(c.after))throw Error();
  return c;
 }catch{throw Error('INVALID_HISTORY_CURSOR');}
}
export const encodeHistoryCursor=(c:HistoryCursor)=>Buffer.from(JSON.stringify(c)).toString('base64url');
