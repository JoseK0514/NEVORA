// Fictional browser-only UI seam. Never imported by the application or builds.
import {createRoot} from 'react-dom/client';
import {NativeDeviceSettings} from '../../src/components/native-shell/device-settings';
import '../../src/components/corp/corp.css';
import './style.css';
type Flat=Record<string,unknown>;
type Port={postMessage(raw:string):void;onmessage?:((event:{data:string})=>void)|null};
let permission='granted',receipt:string|null=null,receiptActive=false,revision:string|null=null,active=false,drop=false,slow=false,actor='Employee',owner='Employee';
const nonce=crypto.randomUUID(),requests:Flat[]=[];
const port:Port={postMessage(raw){const message=JSON.parse(raw);requests.push(message);const send=()=>{
 let result:Flat={state:'unavailable'};
 if(message.method==='hello')result={state:'ready',nonce,platform:'android',spki:'fictional-public-key',keyFingerprint:'a'.repeat(64),permission,generation:receiptActive?receipt:null,revision:receipt};
 else if(message.nonce!==nonce)result={state:'unavailable'};
 else if(message.method==='notifications.permission'){permission='granted';result={state:'permission',permission};}
 else if(message.method==='notifications.complete'){
  const challenge=JSON.parse(message.payload);if(challenge.expectedGeneration===revision){revision=crypto.randomUUID();active=true;owner=actor;if(drop){drop=false;result={state:'unavailable'};}else{receipt=revision;receiptActive=true;result={state:'active',generation:receipt};}}
 }else if(message.method==='notifications.detach'&&message.payload===revision&&active){revision=crypto.randomUUID();active=false;receipt=revision;receiptActive=false;result={state:'complete',generation:receipt};}
 port.onmessage?.({data:JSON.stringify({...result,version:1,id:message.id})});
};if(slow&&message.method==='notifications.complete'){slow=false;setTimeout(send,1200);}else queueMicrotask(send);}};
Object.assign(window,{nevoraCapabilities:port});
window.fetch=async(input,init)=>{
 if(typeof input!=='string'||!['/api/mobile/v1/notifications/status','/api/mobile/v1/notifications/challenge'].includes(input))throw Error('Fixture refuses external IO');
 const body=JSON.parse(String(init?.body));requests.push({action:input,body});
 if(input.endsWith('/status'))return Response.json(active&&owner===actor?{state:'active',generation:revision}:{state:'off'});
 if(body.operation!=='reconcile'&&body.expectedGeneration!==revision)return Response.json({state:'conflict'},{status:409});
 return Response.json({state:'challenge',challenge:{operation:'enroll',expectedGeneration:revision}});
};
function refresh(){window.dispatchEvent(new Event('nevora:native-ready'));}
function reset(){permission='granted';receipt=null;receiptActive=false;revision=null;active=false;drop=false;slow=false;actor='Employee';owner='Employee';refresh();}
createRoot(document.getElementById('root')!).render(<main className="c-page">
 <header><h1>App alerts</h1><p>Fictional UI QA. No real accounts or provider calls.</p></header>
 <div className="qa-controls"><button onClick={reset}>Reset scenario</button><button onClick={()=>{permission='denied';refresh();}}>Simulate permission denied</button><button onClick={()=>{permission='granted';drop=true;refresh();}}>Drop next completion reply</button><button onClick={()=>{slow=true;}}>Delay next completion reply</button><button onClick={()=>{actor=actor==='Employee'?'Owner':'Employee';refresh();}}>Switch fictional account</button></div>
 <div className="qa-panes"><section aria-label="Employee controls"><h2>Employee</h2><NativeDeviceSettings/></section><section aria-label="Owner controls"><h2>Owner</h2><NativeDeviceSettings/></section></div>
</main>);
