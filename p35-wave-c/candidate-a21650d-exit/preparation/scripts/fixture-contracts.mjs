// Fictional browser-only replies. Never fetch, save, seed or start a browser here.
export const reference='4a9c7ed1-9b42-4dc0-8847-324d7ade7832';
const iso=ms=>new Date(ms).toISOString();
const json=(status,value)=>({status,contentType:'application/json',body:JSON.stringify(value)});
export function accountReply({employeeId='AUDIT-E',state='issued',now=Date.now()}={}){
 if(['401','403','503'].includes(state))return json(Number(state),{});
 return json(200,{state:'issued',employeeId,proof:'F'.repeat(43),expiresAt:iso(now+(state==='expired'?1500:900000))});
}
export function receiptReply({commandId=reference,state='ready',now=Date.now()}={}){
 if(['401','403','503','failed'].includes(state))return json(state==='failed'?503:Number(state),{});
 const count=state==='empty'?0:state==='large'?100:1;
 return json(200,{state:'ready',commandId:state==='invalid'?'deliberately-not-the-requested-reference':commandId,observedAt:iso(now),validForMs:15000,receipts:Array.from({length:count},(_,i)=>({employeeId:'AUDIT-E',employeeName:'Fictional María José Rivera Santiago With A Long Name '+i,deviceName:'Fictional front desk tablet',locationName:'Fictional Main Office',action:'CLOCK_IN',performedAt:iso(now-i*60000),timeEntryId:'fictional-entry-'+i}))});
}
export function presentationReply(state='success'){
 if(state==='busy')return json(409,{state:'busy',message:'Fictional requests are still waiting.'});
 if(state==='conflict')return json(409,{state:'conflict'});
 if(['400','401','403','503'].includes(state))return json(Number(state),{});
 return json(200,{state:'saved'});
}
export function uploadReply(state='success'){
 if(state==='invalid')return json(400,{state:'invalid',message:'Use a PNG or WebP image.'});
 if(state==='failed')return json(503,{});
 return json(200,{state:'ready',result:{assetId:'fictional-inspection-logo'}});
}
export function policyReply(state='success'){return json(state==='conflict'?409:['400','401','403','503'].includes(state)?Number(state):200,{});}
export function device(overrides={}){return{id:'fictional-device',name:'Fictional completion tablet',locationId:'loc-1',version:2,state:'ACTIVE',lastSeenAt:null,enrollmentExpiresAt:null,...overrides};}
export function breakType(overrides={}){return{id:'fictional-break',name:'Fictional completion break',version:2,category:'REST',targetMinutes:15,active:true,...overrides};}
export function actionValue(kind,state='success',{now=Date.now()}={}){
 if(kind==='configuration')return state==='success'?{success:'Fictional change saved.',updatedAt:iso(now)}:{error:'Fictional change was not saved.'};
 if(state==='refresh')return{ok:false,error:'Fictional settings changed. Reload before trying again.',refresh:true};
 if(state==='invalid')return{ok:false,error:'Check the fictional entry.',refresh:false};
 if(kind==='break')return{ok:true,breakType:breakType()};
 if(kind==='device')return{ok:true,device:device()};
 if(kind==='setup'){const expiresAt=iso(now+900000);return{ok:true,device:device({state:'PENDING',enrollmentExpiresAt:expiresAt}),setup:{code:'FICTIONAL-SETUP-CODE',expiresAt}};}
 return state==='error'?{error:'Fictional change was not saved.'}:{success:'Fictional change saved.',updatedAt:iso(now)};
}
// The installed Next action reducer consumes response.a and f=='' as no router
// patch. Omit build ID to avoid declaring a fictional build identity.
export function actionReply(value){return{status:200,contentType:'text/x-component',body:'0:{"a":"$@1","f":""}\n1:'+JSON.stringify(value)+'\n'};}
export const clientPropContracts={
 breaks:{keys:['initialTypes','action'],supported:['empty','large','partial'],serverOnly:['failed-read']},
 devices:{keys:['initialDevices','locations','timeZone','action'],supported:['empty','large','partial'],serverOnly:['failed-read']},
 positions:{keys:['positions','available','createAction','updateAction'],supported:['empty','large','failed-read','partial'],serverOnly:[]},
 policies:{keys:['history','locations','timeZone'],supported:['empty','large','partial'],serverOnly:['failed-read']},
 branding:{keys:['workspaceName','revision','seed','logoAssetId','history','timeZone'],supported:['empty','large','partial'],serverOnly:['failed-read']},
 features:{keys:['revision','preset','disabled','blockers','payrollEnabled'],supported:['partial','decided'],serverOnly:['failed-read']},
 locations:{keys:[],supported:[],serverOnly:['first-run-empty','failed-read','partial','company-word-preset']},
};
export function clientProps(kind,state,props,now=Date.now()){
 const c=clientPropContracts[kind];if(!c?.supported.includes(state))throw Error('No truthful client-prop fixture for '+kind+'/'+state);
 const next={...props};
 if(kind==='breaks')next.initialTypes=state==='empty'?[]:Array.from({length:state==='large'?60:2},(_,i)=>breakType({id:'fictional-break-'+i,name:'Fictional long break classification '+i,active:i%2===0,category:['REST','MEAL','OTHER'][i%3]}));
 if(kind==='devices'){next.initialDevices=state==='empty'?[]:Array.from({length:state==='large'?60:5},(_,i)=>device({id:'fictional-device-'+i,name:'Fictional long registered tablet '+i,state:['ACTIVE','UNREGISTERED','PENDING','EXPIRED','REVOKED'][i%5],lastSeenAt:iso(now-i*60000),enrollmentExpiresAt:i%5===2?iso(now+900000):null}));if(state==='partial')next.locations=[{id:'loc-1',name:'Fictional inactive location',clockerKey:'fictional-location',active:false}];}
 if(kind==='positions'){next.available=state!=='failed-read';next.positions=['empty','failed-read'].includes(state)?[]:Array.from({length:state==='large'?60:2},(_,i)=>({id:'fictional-position-'+i,workspaceId:'workspace-fuel',name:'Fictional long qualification '+i,active:i%2===0,createdAt:iso(now),updatedAt:iso(now)}));}
 if(kind==='policies')next.history=state==='empty'?[]:Array.from({length:state==='large'?60:2},(_,i)=>({operationId:'fictional-policy-'+i,revision:i+1,locationId:i%2?null:'loc-1',changedAt:iso(now-i*86400000),changedKeys:['attendance.lateness'],settings:{version:1,attendance:{},labor:{}}}));
 if(kind==='branding'){next.logoAssetId=null;next.history=state==='empty'?[]:Array.from({length:state==='large'?60:2},(_,i)=>({revision:i+1,changedAt:iso(now-i*86400000),changedKeys:['brand.seed']}));}
 if(kind==='features'){next.blockers=state==='decided'?{}:{timeOff:2};next.disabled=state==='decided'?['marketplace']:[];next.payrollEnabled=state==='decided';}
 return next;
}
// Only RSC model lines, during a client navigation. Never rewrite HTML or a
// baseline. Require exactly one prop match; absence/ambiguity is a hard gap.
export function transformClientFlight(text,kind,state,now=Date.now()){
 const contract=clientPropContracts[kind];if(!contract?.keys.length)throw Error('Server-only state requires a separate faithful response fixture');
 let hits=0;const walk=value=>{if(!value||typeof value!=='object')return value;if(!Array.isArray(value)&&contract.keys.every(k=>Object.hasOwn(value,k))){hits++;return clientProps(kind,state,value,now);}if(Array.isArray(value))return value.map(walk);return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v)]));};
 const lines=text.split('\n').map(line=>{const m=/^([0-9a-f]+:)([\[{].*)$/.exec(line);if(!m)return line;let model;try{model=JSON.parse(m[2]);}catch{return line;}return m[1]+JSON.stringify(walk(model));});
 if(hits!==1)throw Error('Expected one '+kind+' props model, got '+hits);
 return{body:lines.join('\n'),hits,fictional:true,scope:'client-navigation-only; live rendering still requires browser verification'};
}
export const selectors={
 workspace:{field:'#workspace-name',submit:'Save changes',form:'Company profile'},
 newLocation:{field:'#new-location-name',short:'#new-location-short-name',submit:'Add location'},
 editLocation:{field:'input[name=name]',submit:'Save changes'},
 branding:{hex:'#brand-hex',color:'#brand-picker',upload:'#brand-logo-file',preset:'Ocean, #1D4ED8',submit:'Save brand',form:null},
 features:{preset:'input[name="word-preset"][value="retail"]',submit:'Save changes',form:null},
 policies:{scope:'#policy-scope',mode:'#policy-lateness-mode',threshold:'#policy-lateness-threshold',effective:'#policy-lateness-effective',submit:'Save policies'},
 positions:{newName:'#new-position-name',edit:'.wc-editable > summary',editName:'.wc-editable[open] input[name=name]',add:'Add position',save:'Save position'},
 account:{employee:'#assisted-employee',attestation:'#assisted-attestation',submit:'Issue recovery code'},
 clocker:{inputLabel:'Saved action reference',submit:'Check receipt'},
 dialogs:{open:'dialog[open]',primary:'dialog[open] button[type=submit]',cancel:'dialog[open] .wc-actions > button[data-kind=secondary]'},
};
