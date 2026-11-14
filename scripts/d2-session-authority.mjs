import assert from 'node:assert/strict';

export async function verifyD2SessionAuthority(request,url){
 // Only this read may reconnect once after ECONNRESET; HTTP refusals and POSTs retain their original behavior.
 const current=await request.get(url,{headers:{'X-Nevora-Time-Correction':'1'},maxRetries:1});
 assert.equal(current.status(),200,'Reused real fixture session must still pass current server authorization');
 return current;
}
