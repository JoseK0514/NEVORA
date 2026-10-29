import type {createPunchFixture} from './clocker-punch-fixture';
import {createCurrentClockerPhotoRuntime} from '../../lib/clocker/photo-server/runtime.server';
export async function photoFixture(f:Awaited<ReturnType<typeof createPunchFixture>>){
 const runtime=createCurrentClockerPhotoRuntime(f.db.executor,async()=>({cleanupDisclosure:'Fictional test cleanup only.',backupDisclosure:'Fictional test backup only.'}),f.key);
 const owner=await runtime.portalProof({employee:{id:f.owner.employeeId,firstName:'Owner',lastName:'QA',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:f.owner.sessionTokenHash});
 await runtime.service.savePolicy(owner,{expectedVersion:0,enabled:true,events:['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT'],retentionDays:7,failureBehavior:'ALLOW_WITH_EXCEPTION'});
 await runtime.service.saveNoticeProfile(owner,{expectedVersion:0,assistanceContact:'Fictional Owner',assistanceInstructions:'Test assistance only.'});
 return {runtime,owner};
}
