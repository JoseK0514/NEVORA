// Pure output sanitizer. It does not open a browser or read credentials.
export function redactCheckerOutput(value,privateRoute){
 const parsed=new URL(privateRoute,'http://127.0.0.1'),secrets=[];
 for(const [name,secret]of parsed.searchParams)if(/review|repair|token|proof|secret|signature/i.test(name)&&secret)secrets.push(secret);
 let text=typeof value==='string'?value:JSON.stringify(value,null,2);
 for(const secret of secrets)for(const encoded of [secret,encodeURIComponent(secret),encodeURIComponent(encodeURIComponent(secret))])text=text.replaceAll(encoded,'REDACTED');
 text=text.replaceAll(privateRoute,parsed.pathname+'?review=REDACTED');
 return text;
}
