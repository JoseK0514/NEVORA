import {workspaceMode} from '../workspace-routing/config.server';
import {workspaceRequestOrigin} from '../workspace-routing/runtime-config.server';
export const correctionResponseHeaders = {
  'Cache-Control':'no-store, private',
  'Vary':'Cookie',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
} as const;

export type CorrectionFailure = 'authentication_required' | 'access_denied' | 'actor_mismatch' | 'view_invalid' |
  'request_intent_required' | 'cross_site_request' | 'json_required' | 'origin_mismatch' |
  'origin_unavailable' | 'invalid_request' | 'source_unavailable' | 'conflict';

/** Nonsecret transport classification; existing response bodies remain compatible. */
export const correctionJson = (body: object, status = 200, failure?: CorrectionFailure) => {
  const codes: Partial<Record<number, CorrectionFailure>> = {400:'invalid_request',401:'authentication_required',403:'access_denied',409:'conflict',503:'source_unavailable'};
  const code = failure ?? codes[status];
  return Response.json(body,{status,headers:{...correctionResponseHeaders,...(code?{'X-Nevora-Failure':code}:{})}});
};

/** Only this platform-issued deployment name, never an arbitrary vercel.app host.
 * Isolated workspaces continue to use their registry-bound domain admission. */
function exactPreviewOrigin(request: Request): string | null {
  if (workspaceMode() !== 'single_company' || process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'preview') return null;
  const hostname = process.env.VERCEL_URL;
  if (!hostname || hostname.length > 253 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/.test(hostname)) return null;
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const forwardedHost = request.headers.get('x-forwarded-host'), protocol = request.headers.get('x-forwarded-proto');
  if (host !== hostname || forwardedHost && forwardedHost !== hostname || protocol && protocol !== 'https') return null;
  return 'https://' + hostname;
}

function allowedOrigin(request: Request): string | null {
  try{if(workspaceMode()==='isolated')return workspaceRequestOrigin(request);}catch{return null;}
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

/**
 * Shared browser-request admission, separate from session and domain authority.
 * Writes require the allowed origin and JSON; reads still reject cross-site
 * metadata, missing intent markers and query parameters.
 */
function admissionFailure(request: Request, write: boolean, header: string, maxBytes: number): {status:400|403|503;code:CorrectionFailure} | null {
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite&&fetchSite!=='same-origin') return {status:403,code:'cross_site_request'};
  if(request.headers.get(header)!=='1') return {status:403,code:'request_intent_required'};
  if(new URL(request.url).search) return {status:400,code:'invalid_request'};
  if(!write) return null;

  const contentType=request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if(contentType!=='application/json') return {status:403,code:'json_required'};

  const expected=allowedOrigin(request);
  if(!expected) return {status:503,code:'origin_unavailable'};
  const origin = request.headers.get('origin');
  const preview = exactPreviewOrigin(request);
  if(origin!==expected && (!preview || origin!==preview)) return {status:403,code:'origin_mismatch'};

  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes)) return {status:400,code:'invalid_request'};
  return null;
}

export function correctionBoundary(request: Request, write: boolean, header='x-nevora-time-correction',maxBytes=8192): 400 | 403 | 503 | null {
  return admissionFailure(request,write,header,maxBytes)?.status ?? null;
}

export function correctionBoundaryResponse(request: Request, write: boolean, header='x-nevora-time-correction',maxBytes=8192,body:object={state:'unavailable'}): Response | null {
  const failure=admissionFailure(request,write,header,maxBytes);
  return failure?correctionJson(body,failure.status,failure.code):null;
}

/** Enforce the limit while streaming actual UTF-8 bytes, even when Content-Length was absent or inaccurate. */
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
