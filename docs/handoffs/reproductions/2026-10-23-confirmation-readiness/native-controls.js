
window.effectRecords=[];window.effectClock=[];window.heldReactTasks=[];window.holdReactTasks=true;
const nativeAdd=window.addEventListener,nativeRemove=window.removeEventListener,records=new WeakMap();
window.addEventListener=function(type,listener,options){
 if(type!=='pagehide'||typeof listener!=='function')return nativeAdd.call(this,type,listener,options);
 let record=records.get(listener);
 if(!record){record={active:false,invocations:0,registrations:0,removals:0};record.wrapped=function(event){record.invocations++;window.effectClock.push({event:'handler',at:performance.now()});return listener.call(this,event);};records.set(listener,record);window.effectRecords.push(record);}
 record.active=true;record.registrations++;window.effectClock.push({event:'install',at:performance.now()});return nativeAdd.call(this,type,record.wrapped,options);
};
window.removeEventListener=function(type,listener,options){
 const record=type==='pagehide'&&typeof listener==='function'?records.get(listener):null;
 if(record){record.active=false;record.removals++;window.effectClock.push({event:'remove',at:performance.now()});return nativeRemove.call(this,type,record.wrapped,options);}
 return nativeRemove.call(this,type,listener,options);
};
const NativeMessageChannel=window.MessageChannel;
window.MessageChannel=class extends NativeMessageChannel{constructor(){super();const port=this.port1;let listener;Object.defineProperty(port,'onmessage',{configurable:true,get:()=>listener,set:value=>{listener=value;port.addEventListener('message',event=>{const run=()=>value(event);if(window.holdReactTasks)window.heldReactTasks.push(run);else run();});port.start();}});}};
window.releaseReactTasks=()=>{window.holdReactTasks=false;for(const run of window.heldReactTasks.splice(0))run();};
window.snapshotLifecycle=()=>({at:performance.now(),authorityFields:document.querySelectorAll('input[name="authority"]').length,sameOperation:document.querySelector('input[name="operationId"]')?.value==='fictional-ssr-operation',activeListeners:window.effectRecords.filter(r=>r.active).length,registrations:window.effectRecords.reduce((n,r)=>n+r.registrations,0),removals:window.effectRecords.reduce((n,r)=>n+r.removals,0),invocations:window.effectRecords.reduce((n,r)=>n+r.invocations,0),heldTasks:window.heldReactTasks.length});
