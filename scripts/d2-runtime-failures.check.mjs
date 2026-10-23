import assert from 'node:assert/strict';
import {test} from 'node:test';
import {safeD2Error,safeD2Text,unexpectedD2Runtime} from './d2-runtime-failures.mjs';

test('a React-handled exception is fatal even without a native page error',()=>{
 const event={phase:'normal',reactBoundary:true,errors:[{name:'TypeError',message:'Load failed'}]};
 assert.deepEqual(unexpectedD2Runtime({runtime:[],console:[event]}),{runtime:[],console:[event]});
});
test('unreadable console error arguments cannot become successful empty errors',()=>{
 const event={phase:'normal',extractionFailed:true,errors:[]};
 assert.deepEqual(unexpectedD2Runtime({runtime:[],console:[event]}),{runtime:[],console:[event]});
});
test('diagnostic text and structured stacks omit credentials, capabilities and opaque values',()=>{
 const privateValue='FICTIONAL_PRIVATE_VALUE_012345678901234567890123456789';
 for(const text of [`token=${privateValue}`,`/api/calendar/${privateValue}`,`postgres://qa:${privateValue}@fictional.invalid/db`,privateValue]){
  assert(!safeD2Text(text).includes(privateValue));
 }
 const error=safeD2Error({name:'TypeError',message:'Load failed',stack:`TypeError: token=${privateValue}\n at fetch (webpack-internal:///(app-pages-browser)/./node_modules/next/src/client/components/router-reducer/fetch-server-response.ts:327:10)\n at ${privateValue}.js:8:3`});
 assert.equal(error.message,'Load failed');assert.deepEqual(error.frames,[{source:'fetch-server-response.ts',line:327,column:10},{source:'other-script',line:8,column:3}]);assert(!JSON.stringify(error).includes(privateValue));
});
test('injected HTTP failures are distinct from JavaScript exceptions',()=>{
 const http={phase:'injected-503',text:'Failed to load resource: the server responded with a status of 503',errors:[]};
 const exception={phase:'injected-503',text:'Unhandled failure',errors:[{name:'TypeError'}]};
 assert.deepEqual(unexpectedD2Runtime({runtime:[],console:[http,exception]}),{runtime:[],console:[exception]});
});
test('the offline allowance cannot hide framework or normal-document native errors',()=>{
 const offline={phase:'offline',message:'Load failed'},framework={phase:'offline',message:'/127.0.0.1/__nextjs_original-stack-frames due to access control checks.'},normal={phase:'normal',message:'Load failed'};
 assert.deepEqual(unexpectedD2Runtime({runtime:[offline,framework,normal],console:[]}),{runtime:[framework,normal],console:[]});
});
