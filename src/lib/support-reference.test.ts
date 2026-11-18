import {expect,it} from '@rstest/core';
import {readSupportReference} from './support-reference';

const reference='c34ed09a-1129-455c-9b60-3018cfce2f40';
const response=(value?:string)=>new Response(null,{status:503,headers:value===undefined?{}:{'X-Nevora-Request-Id':value}});

it('reads only a complete diagnostic UUID from the current response header',()=>{
 expect(readSupportReference(response(reference))).toBe(reference);
 expect(readSupportReference(response(reference.toUpperCase()))).toBe(reference.toUpperCase());
});

it.each(['', 'DEL-20261117-1234', 'payroll-operation', 'prefix-'+reference, reference+'-suffix', reference+', '+reference, reference.replace(/-/g,''), '<script>alert(1)</script>'])(
 'does not turn invalid header %j into a support reference',value=>{
  expect(readSupportReference(response(value))).toBeNull();
 });

it('never falls back to a body operation, request or deletion reference',()=>{
 const reply=Response.json({operationId:reference,requestId:reference,reference:'DEL-1234'},{status:503});
 expect(readSupportReference(reply)).toBeNull();
 expect(reply.bodyUsed).toBe(false);
});

it('does not carry a previous response reference into later failures or expected refusals',()=>{
 expect(readSupportReference(response(reference))).toBe(reference);
 expect(readSupportReference(response())).toBeNull();
 for(const status of [200,400,401,403,409])expect(readSupportReference(new Response(null,{status}))).toBeNull();
});
