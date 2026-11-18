/** Decode only the multipart/alternative messages emitted by the owned SMTP
 * fixture. Missing or duplicate parts fail qualification; no body is regenerated. */
export function decodeAccountEmail(raw:string):{text:string;html:string}{
 const top=raw.split(/\r?\n\r?\n/,1)[0].replace(/\r?\n[ \t]+/g,' ');
 const boundary=/Content-Type:\s*multipart\/alternative;[^\r\n]*boundary="([^"]+)"/i.exec(top)?.[1];
 if(!boundary)throw Error('Missing captured MIME boundary');
 const decoded:Partial<Record<'text'|'html',string>>={};
 for(const part of raw.split('--'+boundary).slice(1,-1)){
  const clean=part.replace(/^\r?\n/,'');const separator=/\r?\n\r?\n/.exec(clean);if(!separator)throw Error('Missing MIME headers');
  const headers=clean.slice(0,separator.index).replace(/\r?\n[ \t]+/g,' '),body=clean.slice(separator.index+separator[0].length).replace(/\r?\n$/,'');
  const type=/Content-Type:\s*text\/(plain|html)\b/i.exec(headers)?.[1],encoding=/Content-Transfer-Encoding:\s*([\w-]+)/i.exec(headers)?.[1].toLowerCase();
  if(!type)throw Error('Unexpected captured MIME alternative');const key=type==='plain'?'text':'html';if(decoded[key]!==undefined)throw Error('Duplicate captured MIME alternative');
  if(encoding==='base64')decoded[key]=Buffer.from(body.replace(/\s/g,''),'base64').toString('utf8');
  else if(encoding==='quoted-printable')decoded[key]=Buffer.from(body.replace(/=\r?\n/g,'').replace(/=([0-9a-f]{2})/gi,(_m,h:string)=>String.fromCharCode(Number.parseInt(h,16))),'latin1').toString('utf8');
  else if(encoding==='7bit')decoded[key]=body;
  else throw Error('Unsupported captured MIME encoding');
 }
 if(decoded.text===undefined||decoded.html===undefined)throw Error('Missing captured MIME alternative');
 return {text:decoded.text,html:decoded.html};
}
export function readAccountEmailSet(messages:readonly {recipient:string;body:string}[],recipient:string){
 const own=messages.filter(m=>m.recipient.toLowerCase().replace(/[<>]/g,'')===recipient.toLowerCase()).map(m=>decodeAccountEmail(m.body));
 return (['invitation','reset','changed'] as const).map(kind=>{
  const path=kind==='invitation'?'/activate':kind==='reset'?'/reset-access':'/login';const found=own.filter(m=>m.text.includes(path)&&m.html.includes(path));
  if(found.length!==1)throw Error('Missing or duplicate captured '+kind+' email');return {kind,...found[0]};
 });
}
