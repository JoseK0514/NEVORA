import assert from 'node:assert/strict';
import {setTimeout} from 'node:timers/promises';

/** A long owned suite shares one real client address. Respect its production
 * login quota without resetting counters, changing clocks, or retrying login.
 * The largest current scope is conservative: an unavailable scope never grants
 * permission. Native sign-in and its assertions still execute exactly once. */
export async function waitForOwnedLoginWindow(query,{limit,wait=setTimeout,now=()=>performance.now(),onWait=()=>{}}){
 assert(Number.isInteger(limit)&&limit>0,'Invalid login window limit');
 const deadline=now()+901000;
 for(;;){
  const [window]=await query(`WITH current_window AS (SELECT EXTRACT(epoch FROM clock_timestamp()) AS seconds)
   SELECT floor(seconds/900)::bigint::text AS bucket,
    COALESCE((SELECT max(attempts) FROM password_recovery_limits WHERE bucket=floor(seconds/900)),0)::int AS attempts,
    ceil((900-mod(seconds,900))*1000)::int AS wait_ms FROM current_window`);
  assert(window&&/^\d+$/.test(window.bucket)&&Number.isInteger(window.attempts)&&window.attempts>=0&&Number.isInteger(window.wait_ms)&&window.wait_ms>0&&window.wait_ms<=900000,'Invalid login window evidence');
  if(window.attempts<limit)return window;
  const remaining=deadline-now();
  assert(remaining>0,'Login window did not advance within one full window');
  const waitMs=Math.min(window.wait_ms,30000,remaining);
  onWait({bucket:window.bucket,attempts:window.attempts,waitMs});
  await wait(waitMs);
 }
}
