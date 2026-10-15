import 'server-only';
const MAX_PASSWORD_WORK=4;
let inFlight=0;
/** Process-local, zero-queue CPU bound; never a shared anonymous account quota. */
export function tryAcquireInvitationPasswordWork():(()=>void)|null {
 if(inFlight>=MAX_PASSWORD_WORK)return null;
 inFlight++;
 let released=false;
 return ()=>{if(!released){released=true;inFlight--;}};
}
