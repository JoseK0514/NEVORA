import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';

export async function waitForD2HoursRouteFocus(heading,entryId,deadline){
 if(typeof entryId!=='string'||!entryId||entryId.length>128)throw Error('Invalid hours route focus target');
 await runBeforeRecoveryDeadline(()=>heading.waitFor({state:'visible',timeout:Math.max(1,deadline-performance.now())}),deadline);
 return runBeforeRecoveryDeadline(()=>heading.evaluate((element,{entryId,remainingMs})=>new Promise((resolve,reject)=>{
  let finished=false,timer;
  const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);observer.disconnect();document.removeEventListener('focusin',check,true);error?reject(Error(error)):resolve({contextMatched:true,headingFocused:true,documentFocused:true});};
  const check=()=>{
   if(!element.isConnected)return finish('Hours route heading changed before focus');
   const frame=element.closest('.c-hours');
   if(frame?.dataset.hoursState==='ready'&&frame.dataset.hoursContext?.split('|')[2]===entryId
    &&document.hasFocus()&&document.activeElement===element)finish();
  };
  const observer=new MutationObserver(check);
  document.addEventListener('focusin',check,true);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-hours-context','data-hours-state']});
  timer=setTimeout(()=>finish('Hours route focus exceeded the original deadline'),Math.max(1,remainingMs));
  check();
 }),{entryId,remainingMs:Math.max(1,deadline-performance.now())}),deadline);
}
