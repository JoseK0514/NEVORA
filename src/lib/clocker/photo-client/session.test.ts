import { afterEach, expect, it, vi } from 'vitest';
import type { PunchCommand, PunchReceipt } from '../punch-types';
import { unconfiguredPhotoPolicy } from '../photo-server/validation';
import type { PhotoNotice, PhotoPolicy } from '../photo-server/contracts';
import { PunchPhotoSession, readPhotoConfiguration, type PhotoBindings, type PhotoSessionContext, type PhotoTransport } from './session';
import { CameraError } from './camera';

const command: PunchCommand = { commandId:'90ef3e34-415b-4513-bb06-6017d35367e3', action:'CLOCK_IN', verificationId:'a'.repeat(64),
  expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null} };
const receipt: PunchReceipt = {commandId:command.commandId,action:command.action,timeEntryId:'entry',breakEntryId:null,performedAt:'2030-01-01T00:00:00Z',
  snapshot:{revision:1,entry:{id:'entry',locationId:'fictional',clockInAt:'2030-01-01T00:00:00Z',status:'CLOCKED_IN',version:1},break:null}};
function fixture(patch: Partial<PhotoPolicy> = {}, context:Partial<PhotoSessionContext>={}) {
  const policy: PhotoPolicy={version:1,enabled:true,events:['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT'],retentionDays:7,
    failureBehavior:'ALLOW_WITH_EXCEPTION',captureMaxBytes:524288,captureMaxDimension:640,uploadWindowSeconds:300,...patch};
  const camera={open:vi.fn(async()=>undefined),capture:vi.fn(async()=>({blob:new Blob(['synthetic'],{type:'image/jpeg'}),width:100,height:100})),close:vi.fn()};
  const preserveIntent=vi.fn<PhotoBindings['preserveIntent']>(),commitExactPunch=vi.fn<PhotoBindings['commitExactPunch']>(async()=>({state:'committed',receipt}));
  const readExactPunch=vi.fn<PhotoBindings['readExactPunch']>(async()=>({state:'committed' as const,receipt}));
  const upload=vi.fn<PhotoTransport['upload']>(async()=>({commandId:command.commandId,state:'stored' as const}));
  const status=vi.fn<PhotoTransport['status']>(async()=>({commandId:command.commandId,state:policy.enabled&&policy.events.includes(command.action)?'stored':'not_required'}));
  const reportMissing=vi.fn<PhotoTransport['reportMissing']>(async()=>({commandId:command.commandId,state:'missing' as const}));
  const bindings:PhotoBindings={preserveIntent,commitExactPunch,readExactPunch,transport:{upload,status,reportMissing}};
  const createObjectURL=vi.fn(()=> 'blob:private-synthetic'),revokeObjectURL=vi.fn();
  const notice:PhotoNotice={policyVersion:policy.version,profileVersion:1,companyName:'Fictional Example Company',retentionDays:policy.retentionDays??7,
    assistanceContact:'Fictional on-site Owner',assistanceInstructions:'Ask the on-site Owner for a different way to record time.',
    cleanupDisclosure:'Fictional test cleanup disclosure.',backupDisclosure:'Fictional test backup disclosure.'};
  const sessionContext:PhotoSessionContext={intent:{subject:'b'.repeat(64),command},policy,notice,proofExpiresAt:new Date(Date.now()+60000).toISOString(),screenExpiresAt:new Date(Date.now()+30000).toISOString(),captureAuthorized:true,...context};
  const environment={camera,createObjectURL,revokeObjectURL};const session=new PunchPhotoSession(sessionContext,bindings,environment);
  const unsubscribe=session.subscribe(()=>undefined);
  return {context:sessionContext,bindings,environment,session,camera,preserveIntent,commitExactPunch,readExactPunch,upload,status,reportMissing,createObjectURL,revokeObjectURL,unsubscribe};
}
const instances: ReturnType<typeof fixture>[]=[];
function setup(patch:Partial<PhotoPolicy>={},context:Partial<PhotoSessionContext>={}){const f=fixture(patch,context);instances.push(f);return f;}
async function capture(f:ReturnType<typeof fixture>){await f.session.open({} as HTMLVideoElement);await f.session.capture();}
afterEach(()=>{instances.splice(0).forEach(f=>{f.unsubscribe();f.session.dispose();});vi.useRealTimers();});

it('uses all configured events while retaining the exact original punch ID', async()=>{
 const f=setup();await capture(f);await f.session.submit();
 expect(f.preserveIntent.mock.invocationCallOrder[0]).toBeLessThan(f.commitExactPunch.mock.invocationCallOrder[0]);
 expect(f.commitExactPunch.mock.calls[0][0]).toEqual(command);
 expect(f.upload.mock.calls[0][0]).toEqual({commandId:command.commandId,verificationId:command.verificationId});
 expect(f.session.getSnapshot()).toMatchObject({phase:'complete',receipt,photoStatus:{state:'stored'}});
 expect(f.revokeObjectURL).toHaveBeenCalledWith('blob:private-synthetic');
});
it('does not submit a punch while camera is open or without a reviewed photo',async()=>{
 const f=setup();await f.session.open({} as HTMLVideoElement);await f.session.submit();expect(f.commitExactPunch).not.toHaveBeenCalled();
});
it('cannot launch real capture from unconfigured or unauthorized setup',async()=>{
 const f=setup({retentionDays:null,failureBehavior:null});await f.session.open({} as HTMLVideoElement);
 expect(f.session.getSnapshot().phase).toBe('setup_required');expect(f.camera.open).not.toHaveBeenCalled();
 const unauthorized=new PunchPhotoSession({intent:{subject:'b'.repeat(64),command},policy:{...unconfiguredPhotoPolicy(),version:1,enabled:true,retentionDays:7,failureBehavior:'ALLOW_WITH_EXCEPTION'},proofExpiresAt:new Date(Date.now()+10000).toISOString(),screenExpiresAt:new Date(Date.now()+10000).toISOString(),captureAuthorized:false},
  {preserveIntent:vi.fn(),commitExactPunch:vi.fn(),readExactPunch:vi.fn(),transport:{upload:vi.fn(),status:vi.fn(),reportMissing:vi.fn()}});
 expect(unauthorized.getSnapshot().phase).toBe('setup_required');unauthorized.dispose();
});
it('skips only explicitly unselected events without opening camera',async()=>{
 const f=setup({events:['CLOCK_OUT']});await f.session.submit();
 expect(f.camera.open).not.toHaveBeenCalled();expect(f.commitExactPunch).toHaveBeenCalledOnce();expect(f.upload).not.toHaveBeenCalled();
 expect(f.session.getSnapshot()).toMatchObject({phase:'complete',photoStatus:{state:'not_required'}});
});
it('blocks the HTTP punch if durable intent preservation fails',async()=>{
 const f=setup();await capture(f);f.preserveIntent.mockImplementation(()=>{throw Error('storage unavailable');});await f.session.submit();
 expect(f.commitExactPunch).not.toHaveBeenCalled();expect(f.session.getSnapshot().phase).toBe('intent_unavailable');
});
it('preserves a confirmed punch after photo upload fails and never repeats it',async()=>{
 const f=setup();await capture(f);f.upload.mockRejectedValue(Error('network'));await f.session.submit();
 expect(f.session.getSnapshot()).toMatchObject({phase:'photo_unknown',receipt});
 await f.session.checkPhoto();expect(f.session.getSnapshot().photoStatus?.state).toBe('stored');
 expect(f.commitExactPunch).toHaveBeenCalledOnce();expect(f.revokeObjectURL).toHaveBeenCalledOnce();
});
it('requires checking an unknown punch instead of automatically resending it',async()=>{
 const f=setup();await capture(f);f.commitExactPunch.mockRejectedValue(Error('lost response'));await f.session.submit();
 expect(f.session.getSnapshot().phase).toBe('punch_unknown');expect(f.upload).not.toHaveBeenCalled();
 await f.session.submit();expect(f.commitExactPunch).toHaveBeenCalledOnce();
 await f.session.checkPunch();expect(f.readExactPunch).toHaveBeenCalledOnce();expect(f.upload).toHaveBeenCalledOnce();
});
it('permits manual same-command retry only when existing recovery explicitly allows it',async()=>{
 const f=setup();await capture(f);f.commitExactPunch.mockRejectedValueOnce(Error('lost response'));await f.session.submit();
 f.readExactPunch.mockResolvedValueOnce({state:'retry_allowed'} as never);await f.session.checkPunch();
 expect(f.session.getSnapshot().phase).toBe('punch_retry_allowed');await f.session.submit();
 expect(f.commitExactPunch).toHaveBeenCalledTimes(2);expect(f.commitExactPunch.mock.calls[1][0]).toEqual(command);
});
it('rejects a receipt for a different command without attaching a photo',async()=>{
 const f=setup();await capture(f);f.commitExactPunch.mockResolvedValue({state:'committed',receipt:{...receipt,commandId:'other'}});await f.session.submit();
 expect(f.session.getSnapshot().phase).toBe('punch_unknown');expect(f.upload).not.toHaveBeenCalled();
});
it('keeps camera-denied fallback explicit and records a separate exception',async()=>{
 const f=setup();f.camera.open.mockRejectedValue(new CameraError('CAMERA_DENIED'));await f.session.open({} as HTMLVideoElement);
 expect(f.session.getSnapshot()).toMatchObject({phase:'camera_error',cameraError:'CAMERA_DENIED'});
 await f.session.submitWithoutPhoto();expect(f.commitExactPunch).toHaveBeenCalledOnce();expect(f.upload).not.toHaveBeenCalled();
 expect(f.reportMissing.mock.calls[0][0]).toEqual({commandId:command.commandId,verificationId:command.verificationId,code:'CAMERA_DENIED'});
 expect(f.session.getSnapshot()).toMatchObject({phase:'complete',receipt,photoStatus:{state:'missing'}});
});
it('clears private blob/preview and stops camera on cancellation before punching',async()=>{
 const f=setup();await capture(f);f.session.cancel();await f.session.submit();
 expect(f.session.getSnapshot()).toMatchObject({phase:'cancelled',previewUrl:null});expect(f.revokeObjectURL).toHaveBeenCalledOnce();
 expect(f.commitExactPunch).not.toHaveBeenCalled();expect(f.camera.close).toHaveBeenCalled();
});
it('expires within the short shared-tablet session and ignores late results',async()=>{
 vi.useFakeTimers();const f=setup();await capture(f);
 let resolve!:(value:unknown)=>void;f.commitExactPunch.mockImplementation(()=>new Promise(r=>{resolve=r;}) as never);
 const sending=f.session.submit();await vi.advanceTimersByTimeAsync(25000);
 expect(f.session.getSnapshot()).toMatchObject({phase:'expired',previewUrl:null});
 resolve({state:'committed',receipt});await sending;expect(f.upload).not.toHaveBeenCalled();
});
it('does not attach a previous person image after cancellation during capture',async()=>{
 const f=setup();await f.session.open({} as HTMLVideoElement);
 let resolve!:(value:{blob:Blob;width:number;height:number})=>void;
 f.camera.capture.mockImplementation(()=>new Promise(r=>{resolve=r;}));const pending=f.session.capture();await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));f.session.cancel();
 resolve({blob:new Blob(['synthetic'],{type:'image/jpeg'}),width:100,height:100});await pending;
 expect(f.session.getSnapshot().previewUrl).toBeNull();expect(f.createObjectURL).not.toHaveBeenCalled();
});
it('rejects a photo status for another command and retains uncertain outcome',async()=>{
 const f=setup();await capture(f);f.upload.mockResolvedValue({commandId:'other',state:'stored'});await f.session.submit();
 expect(f.session.getSnapshot()).toMatchObject({phase:'photo_unknown',receipt,photoStatus:null});
});
it('allows retrying only the same photo after a checked pending photo result',async()=>{
 const f=setup();await capture(f);f.upload.mockRejectedValueOnce(Error('lost upload'));await f.session.submit();
 await f.session.retryPhoto();expect(f.upload).toHaveBeenCalledOnce();
 f.status.mockResolvedValueOnce({commandId:command.commandId,state:'pending'} as never);await f.session.checkPhoto();await f.session.retryPhoto();
 expect(f.upload).toHaveBeenCalledTimes(2);expect(f.commitExactPunch).toHaveBeenCalledOnce();
 expect(f.upload.mock.calls[0][1]).toBe(f.upload.mock.calls[1][1]);
});
it('does not treat pending or unknown photo evidence as saved',async()=>{
 const f=setup();await capture(f);f.upload.mockResolvedValue({commandId:command.commandId,state:'pending'} as never);await f.session.submit();
 expect(f.session.getSnapshot()).toMatchObject({phase:'photo_unknown',photoStatus:{state:'pending'}});
});
it('reads authoritative photo policy outcome even when local event selection skips capture',async()=>{
 const f=setup({events:['CLOCK_OUT']});f.status.mockResolvedValue({commandId:command.commandId,state:'pending'});
 await f.session.submit();expect(f.status).toHaveBeenCalledOnce();expect(f.upload).not.toHaveBeenCalled();
 expect(f.session.getSnapshot()).toMatchObject({phase:'photo_unknown',receipt,photoStatus:{state:'pending'}});
});
it('offers an explicit alternative before camera permission using the same proof and command',async()=>{
 const f=setup();await f.session.submitWithoutPhoto();
 expect(f.camera.open).not.toHaveBeenCalled();expect(f.camera.capture).not.toHaveBeenCalled();expect(f.upload).not.toHaveBeenCalled();
 expect(f.commitExactPunch).toHaveBeenCalledOnce();expect(f.commitExactPunch.mock.calls[0][0]).toEqual(command);
 expect(f.reportMissing.mock.calls[0][0]).toEqual({commandId:command.commandId,verificationId:command.verificationId,code:'PHOTO_ALTERNATIVE'});
 expect(f.session.getSnapshot()).toMatchObject({phase:'complete',receipt,photoStatus:{state:'missing'}});
});
it('closes a live camera and clears captured private data when choosing the alternative',async()=>{
 const f=setup();await capture(f);await f.session.submitWithoutPhoto();
 expect(f.camera.close).toHaveBeenCalled();expect(f.revokeObjectURL).toHaveBeenCalledWith('blob:private-synthetic');
 expect(f.upload).not.toHaveBeenCalled();expect(f.commitExactPunch).toHaveBeenCalledOnce();
});
it('keeps collection inactive without an effective notice while allowing valid time through the approved alternative',async()=>{
 const f=setup({}, {notice:null});expect(f.session.getSnapshot().phase).toBe('setup_required');
 await f.session.open({} as HTMLVideoElement);expect(f.camera.open).not.toHaveBeenCalled();
 await f.session.submitWithoutPhoto();expect(f.commitExactPunch).toHaveBeenCalledOnce();expect(f.upload).not.toHaveBeenCalled();
});
it('pins validated notice data to the effective policy and rejects a stale notice',async()=>{
 const f=setup();expect(f.session.getSnapshot().notice).toMatchObject({companyName:'Fictional Example Company',policyVersion:1,retentionDays:7});
 const stale=setup({}, {notice:{...f.session.getSnapshot().notice!,policyVersion:2}});
 expect(stale.session.getSnapshot().phase).toBe('setup_required');expect(stale.session.getSnapshot().notice).toBeNull();
});
it('enforces the original deadline even when collection is unavailable and an alternative is selected',async()=>{
 vi.useFakeTimers();const f=setup({}, {notice:null,screenExpiresAt:new Date(Date.now()+1000).toISOString()});
 await vi.advanceTimersByTimeAsync(1000);await f.session.submitWithoutPhoto();
 expect(f.session.getSnapshot().phase).toBe('expired');expect(f.commitExactPunch).not.toHaveBeenCalled();
});
it('preserves an alternative after durable recovery storage is repaired',async()=>{
 const f=setup();f.preserveIntent.mockImplementationOnce(()=>{throw Error('storage');});await f.session.submitWithoutPhoto();
 expect(f.session.getSnapshot()).toMatchObject({phase:'intent_unavailable',submissionStarted:false});
 await f.session.submit();expect(f.commitExactPunch).toHaveBeenCalledOnce();expect(f.reportMissing.mock.calls[0][0].code).toBe('PHOTO_ALTERNATIVE');
});
it('retains unknown exception evidence separately from a confirmed time receipt',async()=>{
 const f=setup();f.reportMissing.mockRejectedValue(Error('lost exception response'));await f.session.submitWithoutPhoto();
 expect(f.session.getSnapshot()).toMatchObject({phase:'photo_unknown',receipt,photoStatus:null,submissionStarted:true});
 await f.session.submitWithoutPhoto();expect(f.commitExactPunch).toHaveBeenCalledOnce();
});
it('recognizes the approved alternative code in an authoritative missing status',async()=>{
 const f=setup();f.reportMissing.mockResolvedValue({commandId:command.commandId,state:'missing',code:'PHOTO_ALTERNATIVE'});
 await f.session.submitWithoutPhoto();expect(f.session.getSnapshot()).toMatchObject({phase:'complete',photoStatus:{state:'missing',code:'PHOTO_ALTERNATIVE'}});
});
it('parses notice and settings as one effective configuration without inventing missing company data',()=>{
 const f=setup();const notice=f.session.getSnapshot().notice!;
 const policy={...unconfiguredPhotoPolicy(),version:notice.policyVersion,retentionDays:notice.retentionDays};
 expect(readPhotoConfiguration({policy,notice})).toMatchObject({policy,notice});
 expect(readPhotoConfiguration({policy})).toEqual({policy,notice:null});
 expect(readPhotoConfiguration({policy,notice:{...notice,policyVersion:2}}).notice).toBeNull();
 expect(()=>readPhotoConfiguration({notice})).toThrow();
});
it('preserves the original time receipt when authoritative photo recovery reports Owner removal',async()=>{
 const f=setup();await capture(f);f.upload.mockRejectedValueOnce(Error('lost response'));await f.session.submit();
 f.status.mockResolvedValueOnce({commandId:command.commandId,state:'removed'});await f.session.checkPhoto();
 expect(f.session.getSnapshot()).toMatchObject({phase:'complete',receipt,photoStatus:{state:'removed'},previewUrl:null});
 expect(f.commitExactPunch).toHaveBeenCalledOnce();expect(f.revokeObjectURL).toHaveBeenCalledOnce();
});
it('waits for durable readback and refuses a late storage result after cancellation',async()=>{
 const f=setup();await capture(f);let release!:()=>void;f.preserveIntent.mockImplementation(()=>new Promise<void>(resolve=>{release=resolve;}));
 const work=f.session.submit();await Promise.resolve();expect(f.commitExactPunch).not.toHaveBeenCalled();f.session.cancel();release();await work;expect(f.commitExactPunch).not.toHaveBeenCalled();
});
it('discards a camera opened under a changed policy or PIN context',async()=>{
 const f=fixture();const verifyContext=vi.fn(async()=>{});let release!:()=>void;f.camera.open.mockImplementation(()=>new Promise<undefined>(r=>{release=()=>r(undefined);}));
 const session=new PunchPhotoSession(f.context,{...f.bindings,verifyContext},f.environment);const work=session.open({} as HTMLVideoElement);await Promise.resolve();await Promise.resolve();verifyContext.mockRejectedValue(Error('Owner turned photos off'));release();await work;
 expect(session.getSnapshot()).toMatchObject({phase:'cancelled',previewUrl:null});expect(f.camera.close).toHaveBeenCalled();expect(f.commitExactPunch).not.toHaveBeenCalled();session.dispose();
});
it('inherits the original PIN monotonic deadline even if wall time moves backwards',async()=>{
 const mono=vi.spyOn(performance,'now').mockReturnValue(1000);let wall:ReturnType<typeof vi.spyOn>|undefined;
 try{const f=setup({}, {screenMonotonicExpiresAt:2000});const prior=Date.now();wall=vi.spyOn(Date,'now').mockReturnValue(prior-120000);mono.mockReturnValue(2001);await f.session.open({} as HTMLVideoElement);expect(f.session.getSnapshot().phase).toBe('expired');expect(f.camera.open).not.toHaveBeenCalled();}finally{wall?.mockRestore();mono.mockRestore();}
});
