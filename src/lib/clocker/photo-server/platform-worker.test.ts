import {expect,it,vi} from 'vitest';
import {handlePhotoCleanupTrigger} from './platform-worker';
const request=(id?:string)=>new Request('https://worker.example.invalid/',{method:'POST',headers:id?{'x-neon-trigger-invocation-id':id}:{}});
it('requires a platform-attested trigger and never accepts Company or SQL from a request',async()=>{
 const run=vi.fn().mockResolvedValue({backlog:false});
 expect((await handlePhotoCleanupTrigger(request(),run)).status).toBe(403);expect(run).not.toHaveBeenCalled();
 expect((await handlePhotoCleanupTrigger(request('run-123'),run)).status).toBe(200);expect(run).toHaveBeenCalledWith('run-123:0');
});
it('drains at most ten bounded batches and reports remaining work or transport failure',async()=>{
 const run=vi.fn().mockResolvedValue({backlog:true});
 expect((await handlePhotoCleanupTrigger(request('run-124'),run)).status).toBe(503);expect(run).toHaveBeenCalledTimes(10);
 run.mockRejectedValue(Error('database secret must not be returned'));
 const response=await handlePhotoCleanupTrigger(request('run-125'),run);expect(response.status).toBe(503);expect(await response.text()).not.toContain('secret');
});
