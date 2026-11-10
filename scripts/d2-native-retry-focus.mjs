import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {captureD2NativeRetry} from './d2-native-retry-diagnostics.mjs';

/** Reacquire native focus during snapshot renewal; never retry input after it starts. */
export async function pressFocusedD2Retry(retry,page,receipt,postCalls,deadline,{pollMs=25}={}){
 if(!Number.isFinite(pollMs)||pollMs<1||pollMs>1000)throw Error('Invalid retry focus polling interval');
 for(;;){
  await runBeforeRecoveryDeadline(()=>retry.focus({timeout:Math.max(1,deadline-performance.now())}),deadline);
  const probe={phases:[]};
  await runBeforeRecoveryDeadline(()=>captureD2NativeRetry(probe,page,'focused',postCalls),deadline);
  const witness=probe.phases[0];
  if(witness?.tainted!==false||witness.diagnosticFailed===true)throw Error('Native retry requires an untainted focus witness');
  if(witness.enabled===true&&witness.buttonPresent===true&&witness.buttonFocused===true&&witness.documentFocused===true&&witness.visible===true){
   if(receipt.phases.length>=8)throw Error('Native retry phase limit exceeded');
   receipt.phases.push(witness);
   break;
  }
  await runBeforeRecoveryDeadline(()=>new Promise(resolve=>setTimeout(resolve,pollMs)),deadline);
 }
 // Browser focus can still change after the witness. That must fail normal
 // confirmation/POST assertions, without another Enter or any direct click.
 await runBeforeRecoveryDeadline(()=>{
  if(performance.now()>=deadline)throw Error('Browser response exceeded the original recovery deadline');
  return page.keyboard.press('Enter');
 },deadline);
}
