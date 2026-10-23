export async function runBeforeRecoveryDeadline(work,deadline){
 const remaining=deadline-performance.now();
 const expired=()=>Error('Browser response exceeded the original recovery deadline');
 if(!Number.isFinite(remaining)||remaining<=0)throw expired();
 let timer;
 try{
  await Promise.race([Promise.resolve().then(work),new Promise((_,reject)=>{timer=setTimeout(()=>reject(expired()),remaining);})]);
  if(performance.now()>=deadline)throw expired();
 }finally{clearTimeout(timer);}
}

export async function finishResponseByDeadline(response,deadline){
 return runBeforeRecoveryDeadline(async()=>{
  let result;
  try{result=await response.finished();}catch{throw Error('Browser response body failed');}
  if(result!==null)throw Error('Browser response body failed');
 },deadline);
}
