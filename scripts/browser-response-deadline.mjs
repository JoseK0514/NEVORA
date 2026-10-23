export async function finishResponseByDeadline(response,deadline){
 const remaining=deadline-performance.now();
 const expired=()=>Error('Browser response exceeded the original recovery deadline');
 if(!Number.isFinite(remaining)||remaining<=0)throw expired();
 let timer;
 try{
  const body=Promise.resolve().then(()=>response.finished()).then(value=>{if(value!==null)throw Error('Browser response body failed');},()=>{throw Error('Browser response body failed');});
  await Promise.race([body,new Promise((_,reject)=>{timer=setTimeout(()=>reject(expired()),remaining);})]);
  if(performance.now()>=deadline)throw expired();
 }finally{clearTimeout(timer);}
}
