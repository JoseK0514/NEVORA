import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {runNativeSdkProcess} from './native-build.mjs';

const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function delayedBuild(){
 const child=new EventEmitter();child.pid=12345;child.kill=()=>true;child.unref=()=>{};
 let settings;
 return {child,launch:(_command,_args,value)=>{settings=value;if(value.signal)value.signal.addEventListener('abort',()=>child.emit('error',Object.assign(Error('fictional cancellation'),{name:'AbortError'})),{once:true});return child;},get settings(){return settings;}};
}
test('cancellation must not settle before child closure, and unproved SDK descendants cannot be called closed',async()=>{
 const controller=new AbortController(),fake=delayedBuild();let settled=false;
 const result=runNativeSdkProcess({command:'fictional-sdk',args:[],signal:controller.signal,launch:fake.launch,terminationGraceMs:100}).then(()=>{settled=true;return null;},error=>{settled=true;return error;});
 controller.abort(Error('fictional cancellation'));
 await tick();assert.equal(settled,false,'AbortError is a request, not confirmed process exit');
 fake.child.emit('exit',null,'SIGTERM');await tick();assert.equal(settled,false,'close must follow exit before log lifetime closes');
 fake.child.emit('close',null,'SIGTERM');
 const error=await result;assert.equal(error.nativeBuildOwnershipClosed,false);assert.equal(error.buildProcessExited,true);
});
test('a timed out build waits for closure and reports descendant ownership unproved',async()=>{
 const controller=new AbortController(),fake=delayedBuild();let settled=false;
 const result=runNativeSdkProcess({command:'fictional-sdk',args:[],signal:controller.signal,launch:fake.launch,timeoutMs:10,terminationGraceMs:100}).catch(error=>{settled=true;return error;});
 await new Promise(resolve=>setTimeout(resolve,25));assert.equal(settled,false);
 fake.child.emit('close',null,'SIGTERM');const error=await result;
 assert.equal(error.nativeBuildOwnershipClosed,false);assert.equal(error.buildProcessExited,true);
});
test('unconfirmed termination is bounded and cannot report closed ownership',async()=>{
 const controller=new AbortController(),fake=delayedBuild();
 const result=runNativeSdkProcess({command:'fictional-sdk',args:[],signal:controller.signal,launch:fake.launch,terminationGraceMs:20}).catch(error=>error);
 controller.abort(Error('fictional cancellation'));
 const error=await result;assert.equal(error.nativeBuildOwnershipClosed,false);assert.equal(error.buildProcessExited,false);
});
