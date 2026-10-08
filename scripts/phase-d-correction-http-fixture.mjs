// QA-only: bind direct authenticated fixture requests to the session that reads
// their correction context, just as the real rendered forms do.
export async function boundCorrectionPost(client,url,options){
  const response=await client.get(url,{headers:options.headers});
  const snapshot=await response.json();
  return client.post(url,{...options,headers:{...options.headers,
    ...(snapshot.state==='ready'&&snapshot.authority?{'X-Nevora-Correction-Authority':snapshot.authority}:{})}});
}
