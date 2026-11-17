import 'server-only';
import type { BusinessRecord, BusinessSourceSpec, BusinessVersionInput, BusinessWindow } from './contracts';
import { BUSINESS_INPUT_BYTES, checkpoint, exact, instant, normalizeBusinessVersion, object, opaque, parseBusinessSourceSpec, parseWindow } from './parse';
export type ApprovedSecretReference = Readonly<{ kind: 'REFERENCE'; store: 'keychain' | 'vault'; name: string; environment: 'development' }>;
export type ConnectorReadScope = Readonly<{ workspaceId: string; source: Readonly<BusinessSourceSpec>; window: Readonly<BusinessWindow>; accountRefs: readonly string[]; locationIds: readonly string[] }>;
export type ReadonlyBusinessConnector = { mode: 'READ_ONLY_SNAPSHOT'; readPages(scope: ConnectorReadScope, reference: ApprovedSecretReference, signal: AbortSignal): AsyncIterable<unknown> };
export type RegisteredReadonlyBusinessConnector = Readonly<{ id: string }>;
type Registration = { source: BusinessSourceSpec; workspaceId: string; accountRefs: string[]; locationIds: string[]; reference: ApprovedSecretReference; adapter: ReadonlyBusinessConnector };
const registrations = new WeakMap<RegisteredReadonlyBusinessConnector, Registration>();
function fail(code: string): never { throw Error('CONNECTOR_' + code); }
function refs(value: unknown, max: number): string[] { if (!Array.isArray(value) || value.length > max) return fail('SCOPE'); const list = value.map(opaque); if (new Set(list).size !== list.length) return fail('SCOPE'); return list.sort(); }
/** Server composition only. No route accepts a registration, URL, credential or
 * handle. This contract is not proof of provider authentication or permissions;
 * no real adapter is registered by the application in this release. */
export function registerReadonlyBusinessConnector(value: unknown): RegisteredReadonlyBusinessConnector {
  try {
    const v = object(value); exact(v,'id workspaceId environment source accountRefs locationIds secretReference adapter');
    if (v.environment !== 'development') return fail('ENVIRONMENT');
    const reference = object(v.secretReference); exact(reference,'kind store name environment');
    if (reference.kind !== 'REFERENCE' || !['keychain','vault'].includes(String(reference.store)) || reference.environment !== 'development') return fail('SECRET_REFERENCE');
    const source = parseBusinessSourceSpec(v.source), accountRefs = refs(v.accountRefs,100), locationIds = refs(v.locationIds,200);
    if (source.domain === 'FINANCE' ? !accountRefs.length || locationIds.length !== 0 : accountRefs.length !== 0 || !locationIds.length) return fail('SCOPE');
    const adapter = object(v.adapter); exact(adapter,'mode readPages'); if (adapter.mode !== 'READ_ONLY_SNAPSHOT' || typeof adapter.readPages !== 'function') return fail('CAPABILITY');
    const handle = Object.freeze({ id: opaque(v.id) });
    registrations.set(handle,{source,workspaceId:opaque(v.workspaceId),accountRefs,locationIds,reference:Object.freeze({kind:'REFERENCE',store:reference.store as 'keychain'|'vault',name:opaque(reference.name),environment:'development'}),adapter:{mode:'READ_ONLY_SNAPSHOT',readPages:adapter.readPages as ReadonlyBusinessConnector['readPages']}});
    return handle;
  } catch (error) { if (error instanceof Error && /^CONNECTOR_[A-Z_]+$/.test(error.message)) throw error; return fail('CONFIGURATION'); }
}
function nextPage(iterator: AsyncIterator<unknown>, signal: AbortSignal): Promise<IteratorResult<unknown>> {
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(signal.reason ?? Error('CONNECTOR_CANCELLED'));signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted){signal.removeEventListener('abort',abort);abort();return;}
    Promise.resolve().then(()=>iterator.next()).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
  });
}
export async function collectReadonlyBusinessSnapshot(handle: RegisteredReadonlyBusinessConnector, windowValue: unknown, observedAt: string, incoming: AbortSignal): Promise<{input:BusinessVersionInput;provenance:{kind:'CONNECTOR_SNAPSHOT';connectorId:string;workspaceId:string;snapshotId:string;revision:string;sourceAsOf:string}}> {
  const signal=AbortSignal.any([incoming,AbortSignal.timeout(20000)]);checkpoint(signal);
  const registration=registrations.get(handle);if(!registration)return fail('UNREGISTERED');
  let iterator:AsyncIterator<unknown>|undefined,complete=false;
  try {
    const window=parseWindow(windowValue);instant(observedAt);if(window.toAt>observedAt)return fail('FUTURE_WINDOW');
    const source={...registration.source};normalizeBusinessVersion({source,window,sourceAsOf:window.toAt,completeness:'COMPLETE',records:[]},signal);
    const scope:ConnectorReadScope=Object.freeze({workspaceId:registration.workspaceId,source:Object.freeze(source),window:Object.freeze({...window}),accountRefs:Object.freeze([...registration.accountRefs]),locationIds:Object.freeze([...registration.locationIds])});
    iterator=registration.adapter.readPages(scope,registration.reference,signal)[Symbol.asyncIterator]();
    const records:BusinessRecord[]=[],pageIds=new Set<string>(),recordIds=new Set<string>();let identity:{snapshotId:string;revision:string;sourceAsOf:string}|undefined,final=false,bytes=0,pages=0;
    while(true){
      checkpoint(signal);const next=await nextPage(iterator,signal);checkpoint(signal);
      if(next.done){complete=true;break;}
      if(final)return fail('AFTER_FINAL_PAGE');if(++pages>1000)return fail('INPUT_LIMIT');
      const p=object(next.value);exact(p,'pageId snapshotId revision sourceAsOf final records');
      const pageId=opaque(p.pageId),snapshotId=opaque(p.snapshotId),revision=opaque(p.revision),sourceAsOf=instant(p.sourceAsOf);
      if(pageIds.has(pageId))return fail('DUPLICATE_PAGE');pageIds.add(pageId);
      if(sourceAsOf>observedAt || sourceAsOf<window.toAt)return fail('AS_OF');
      if(identity && (identity.snapshotId!==snapshotId || identity.revision!==revision || identity.sourceAsOf!==sourceAsOf))return fail('SNAPSHOT_CHANGED');
      if(!identity){identity={snapshotId,revision,sourceAsOf};bytes=Buffer.byteLength(JSON.stringify({source,window,sourceAsOf,completeness:'COMPLETE',records:[]}));}
      if(typeof p.final!=='boolean' || !Array.isArray(p.records))return fail('INVALID_PAGE');
      if(records.length+p.records.length>1000)return fail('INPUT_LIMIT');
      const normalized=normalizeBusinessVersion({source,window,sourceAsOf,completeness:'COMPLETE',records:p.records},signal);
      for(const row of normalized.records){checkpoint(signal);if(recordIds.has(row.recordId))return fail('DUPLICATE_RECORD');recordIds.add(row.recordId);
        if('accountRef'in row ? !registration.accountRefs.includes(row.accountRef) : !registration.locationIds.includes(row.locationId))return fail('SCOPE');
        bytes+=Buffer.byteLength(JSON.stringify(row))+(records.length?1:0);if(bytes>BUSINESS_INPUT_BYTES)return fail('INPUT_LIMIT');records.push(row);
      }
      final=p.final;
    }
    if(!identity || !final)return fail('INCOMPLETE_SNAPSHOT');
    return {input:normalizeBusinessVersion({source,window,sourceAsOf:identity.sourceAsOf,completeness:'COMPLETE',records},signal),provenance:{kind:'CONNECTOR_SNAPSHOT',connectorId:handle.id,workspaceId:registration.workspaceId,...identity}};
  }catch(error){checkpoint(signal);if(error instanceof Error && /^CONNECTOR_[A-Z_]+$/.test(error.message))throw error;return fail('UNAVAILABLE');}
  finally{if(!complete && iterator?.return){try{void Promise.resolve(iterator.return()).catch(()=>{});}catch{ /* Cleanup never replaces a sanitized collection failure. */ }}}
}
