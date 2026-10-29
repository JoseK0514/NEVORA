export type RefusalConsole={engine:string;text:string;url:string;at:number};
export type ObservedNotificationRefusal={engine:string;url:string;status:number;at:number;authorityLoss:boolean;bodySafe:boolean};
/** Match actual unchanged denial bytes, never a mutable flag at console delivery. */
export function expectedNotificationRefusal(entry:RefusalConsole,origin:string,replies:ObservedNotificationRefusal[]):boolean{
 const status=entry.text.match(/status of (401|403)/)?.[1];if(!status||!Number.isFinite(entry.at))return false;
 let url:URL;try{url=new URL(entry.url);}catch{return false;}
 if(url.origin!==origin||url.pathname!=='/api/notifications'||url.search||url.hash)return false;
 const matching=replies.filter(reply=>reply.engine===entry.engine&&reply.url===entry.url&&reply.status===Number(status));
 return matching.some(reply=>reply.at<=entry.at)&&matching.every(reply=>Number.isFinite(reply.at)&&reply.authorityLoss&&reply.bodySafe);
}
export function safeNotificationRefusal(body:unknown):boolean{
 if(!body||typeof body!=='object'||Array.isArray(body))return false;
 const value=body as Record<string,unknown>;
 return Object.keys(value).sort().join(',')==='reason,state'&&value.state==='unavailable'&&value.reason==='access_denied';
}
