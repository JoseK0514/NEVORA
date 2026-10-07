export const correctionResponseHeaders = {
  'Cache-Control':'no-store, private',
  'Vary':'Cookie',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
} as const;

export const correctionJson = (body: object, status = 200) =>
  Response.json(body,{status,headers:correctionResponseHeaders});

function allowedOrigin(request: Request): string | null {
  const configured=process.env.FUEL_PORTAL_ORIGIN?.trim();
  if(configured){
    try{
      const value=new URL(configured);
      if(value.username||value.password||value.pathname!=='/'||value.search||value.hash||
          !['http:','https:'].includes(value.protocol)||
          (process.env.NODE_ENV==='production'&&value.protocol!=='https:')) return null;
      return value.origin;
    }catch{return null;}
  }

  const host=request.headers.get('host');
  if(host){
    const forwarded=request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    const protocol=forwarded==='https'||forwarded==='http'
      ? `${forwarded}:`
      : new URL(request.url).protocol;
    try{
      const value=new URL(`${protocol}//${host}`);
      if(value.username||value.password||value.pathname!=='/'||value.search||value.hash||
          !['http:','https:'].includes(value.protocol)) return null;
      return value.origin;
    }catch{return null;}
  }

  try{return new URL(request.url).origin;}
  catch{return null;}
}

export function correctionBoundary(request: Request, write: boolean, header='x-nevora-time-correction',maxBytes=8192): 400 | 403 | 503 | null {
  const fetchSite=request.headers.get('sec-fetch-site');
  if((fetchSite&&fetchSite!=='same-origin')||
      request.headers.get(header)!=='1') return 403;
  if(new URL(request.url).search) return 400;
  if(!write) return null;

  const contentType=request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if(contentType!=='application/json') return 403;

  const expected=allowedOrigin(request);
  if(!expected) return 503;
  if(request.headers.get('origin')!==expected) return 403;

  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes)) return 400;
  return null;
}

export async function readCorrectionJson(request: Request,maxBytes=8192): Promise<unknown> {
  const reader=request.body?.getReader();
  if(!reader) throw new Error('invalid_body');
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let body='',size=0;
  try{
    while(true){
      const chunk=await reader.read();
      if(chunk.done)break;
      size+=chunk.value.byteLength;
      if(size>maxBytes){await reader.cancel();throw new Error('invalid_body');}
      body+=decoder.decode(chunk.value,{stream:true});
    }
    body+=decoder.decode();
  }finally{reader.releaseLock();}
  if(!body)throw new Error('invalid_body');
  return JSON.parse(body);
}
