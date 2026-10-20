/** External source-reviewed POST reads. Unknown or mutable commands never pass. */
export function allowedOwnedRead(request) {
 if(request.method()!=='POST')return false;
 let body;try{body=request.postDataJSON();}catch{return false;}
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const exact=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
 const period=value=>exact(value,['startDate','endDate'])&&typeof value.startDate==='string'&&typeof value.endDate==='string';
 const path=new URL(request.url()).pathname;
 if(path==='/api/timecards'||path==='/api/reports')return period(body);
 if(path==='/api/manager/action-center'||path==='/api/manager/action-intelligence')return exact(body,['weekStart'])&&typeof body.weekStart==='string';
 if(path==='/api/period-close')return exact(body,['action','command'])&&body.action==='READ'&&period(body.command);
 return false;
}
