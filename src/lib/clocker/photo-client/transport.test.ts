import {expect,it,vi} from 'vitest';
import {createClockerPhotoTransport,type PhotoFetcher} from './transport';
const command={commandId:'90ef3e34-415b-4513-bb06-6017d35367e3',verificationId:'a'.repeat(64)};
it('fences upload with its detached original policy and persisted assistance versions',async()=>{
 const request=vi.fn<PhotoFetcher>(async()=>Response.json({state:'stored'}));const snapshot={policyVersion:2,profileVersion:3};
 const transport=createClockerPhotoTransport('fictional-location',request,snapshot);snapshot.profileVersion=999;
 await transport.upload(command,new Blob(['synthetic'],{type:'image/jpeg'}),new AbortController().signal);
 const options=request.mock.calls[0][1];const headers=new Headers(options.headers);
 expect(headers.get('x-nevora-photo-policy-version')).toBe('2');expect(headers.get('x-nevora-photo-profile-version')).toBe('3');
 expect(headers.get('x-nevora-photo-command')).toBe(command.commandId);expect(headers.get('x-nevora-photo-verification')).toBe(command.verificationId);
 expect(options.body).toBeInstanceOf(Blob);
});
it('keeps capture upload inactive without a verified snapshot while preserving protected status and exception requests',async()=>{
 const request=vi.fn<PhotoFetcher>(async()=>Response.json({state:'missing'}));const transport=createClockerPhotoTransport('fictional-location',request);
 expect(()=>transport.upload(command,new Blob(['synthetic'],{type:'image/jpeg'}),new AbortController().signal)).toThrow();expect(request).not.toHaveBeenCalled();
 await transport.reportMissing({...command,code:'PHOTO_ALTERNATIVE'},new AbortController().signal);
 expect(JSON.parse(String(request.mock.calls[0][1].body))).toEqual({operation:'missing',command:{...command,code:'PHOTO_ALTERNATIVE'}});
});
it('keeps a stale association rejection explicit instead of pretending an upload succeeded',async()=>{
 const transport=createClockerPhotoTransport('fictional-location',async()=>Response.json({code:'POLICY_CHANGED'},{status:409}),{policyVersion:1,profileVersion:1});
 await expect(transport.upload(command,new Blob(['synthetic'],{type:'image/jpeg'}),new AbortController().signal)).rejects.toMatchObject({code:'POLICY_CHANGED'});
});
