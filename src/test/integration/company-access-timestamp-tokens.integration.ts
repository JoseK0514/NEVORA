import {expect,it,vi} from 'vitest';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import {companyAccessFixture} from './company-access-fixture';
import {issued,ownedPassword} from './company-access-claim.test-support';
import {claimInvitation} from '../../lib/auth/invitations/claim.server';
import * as passwords from '../../lib/auth/password';
vi.mock('server-only',()=>({}));
/** Model pre/post-rollout session defaults with actual SQL, never rewrite stored
 * invitation versions or guess how a historical locale encoded its text. */
function formatted(ex:SqlExecutor,zone:string,style:string):SqlExecutor{
 const setup=[{text:"SELECT set_config('TimeZone',$1,true)",values:[zone]},{text:"SELECT set_config('DateStyle',$1,true)",values:[style]}];
 return {query:async<T>(statement:SqlStatement,signal?:AbortSignal)=>(await ex.transaction([...setup,statement],signal))[2] as T[],transaction:async(statements,signal)=>(await ex.transaction([...setup,...statements],signal)).slice(2)};
}
it('keeps an existing UTC/ISO invitation usable under the canonical source session contract',async()=>{
 const f=await companyAccessFixture();try{const invite=await issued({...f,db:{...f.db,executor:formatted(f.db.executor,'UTC','ISO, MDY')}});expect(await claimInvitation(invite.proof,ownedPassword,formatted(f.db.executor,'UTC','ISO, YMD'))).toEqual({state:'activated',employeeId:'target'});}finally{await f.db.dispose();}
});
it('fails closed for a persisted noncanonical invitation version and supports explicit Owner reissue without rewriting its old version',async()=>{
 const f=await companyAccessFixture();try{
  const legacy=formatted(f.db.executor,'Pacific/Honolulu','SQL, DMY'),old=await issued({...f,db:{...f.db,executor:legacy}}),[stored]=await f.q<{target_version:string}>('SELECT target_version FROM company_invitations WHERE id=$1',[old.receipt.invitationId]);
  const canonical=formatted(f.db.executor,'UTC','ISO, YMD'),hash=vi.spyOn(passwords,'hashPassword');
  try{expect(await claimInvitation(old.proof,ownedPassword,canonical)).toEqual({state:'invalid'});expect(hash).not.toHaveBeenCalled();}finally{hash.mockRestore();}
  expect(await f.q("SELECT count(*)::int AS n FROM employee_credentials WHERE employee_id='target'")).toEqual([{n:0}]);
  const fresh=await issued({...f,db:{...f.db,executor:canonical}});expect(fresh.proof).not.toBe(old.proof);expect(await claimInvitation(old.proof,ownedPassword,canonical)).toEqual({state:'invalid'});expect(await claimInvitation(fresh.proof,ownedPassword,canonical)).toEqual({state:'activated',employeeId:'target'});
  expect(await f.q('SELECT target_version FROM company_invitations WHERE id=$1',[old.receipt.invitationId])).toEqual([stored]);expect(await f.q("SELECT count(*)::int AS n FROM company_invitation_events WHERE action='CONSUME'")).toEqual([{n:1}]);
 }finally{await f.db.dispose();}
});
