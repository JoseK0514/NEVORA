// SOURCE PREPARATION ONLY. All assertions UNEXECUTED. No native/issuer mocks.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadPortalRuntimeSourceImage } from './portal-runtime-startup-loader';
import { inspectPortalCurrentIssuanceSource, comparePortalCurrentIssuanceSources,
  isPortalCurrentIssuanceSourceObservation } from './portal-current-issuance-source';

type Data = Record<string, unknown>;
const data = (value: unknown): Data => value as Data; // Known fixture only.
const at = '2026-10-09 12:00:00.123456+00', token = 'a'.repeat(64);
const names = ['resolverSource','rootSourceInspectorSource','portalBindingSource','installedPolicyInspectorSource',
  'canonicalPolicySource','vocabularySource','approvedPRDSource','auditedRoleGuardSource','originalRuntimeLoginSource','nativeGraphPlanSource'];
function fixture() {
  // IP03's independently retained fictional native policy wire; new employee /
  // membership rows are fictional too. No executing or approved source claim.
  const policy = JSON.parse(readFileSync(new URL('./fixtures/installed-policy-native-observation.json', import.meta.url), 'utf8'));
  const imageInput: Data = { format: 'PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1' };
  for (const name of names) imageInput[name] = [...Buffer.from('fictional retained source '+name)];
  for (const name of ['canonicalPolicySource','vocabularySource','approvedPRDSource']) imageInput[name] = policy.expected[name];
  const loaded = loadPortalRuntimeSourceImage(imageInput);
  if (loaded.status !== 'SOURCE_IMAGE_LOADED_NOT_EXECUTION_ATTESTATION') throw new Error('fixture image invalid');
  const workspaceId = policy.expected.workspaceId, employeeId = ' employee-β ';
  const p: Data = {
    kind: 'PORTAL_SOURCE_OBSERVATION_V1', workspace: { id: workspaceId, active: true, version: at },
    employee: { id: employeeId, workspaceId, active: true, role: 'MANAGER', version: at },
    credential: { employeeId, version: at, mustChangePassword: true },
    incarnation: { workspaceId, version: policy.expected.workspaceIncarnation },
    portal: { workspaceId, employeeId, authorizationVersion: '9223372036854775807', portalAccessVersion: '9007199254740993',
      capabilityPolicyRevision: policy.expected.policyRevision, state: 'ENABLED', proofProvenance: 'LEGACY_UNVERIFIED', provenanceReference: 'fictional legacy reference' },
    session: { tokenHash: token, employeeId, expiresAt: '2026-10-10 12:00:00.123456+00', createdAt: at },
    issuance: { tokenHash: token, workspaceId, employeeId, workspaceIncarnation: policy.expected.workspaceIncarnation,
      portalAccessVersion: '9007199254740993', sessionCreatedAt: at },
    administrative: { workspaceId, employeeId, scopeKind: 'LOCATIONS', scopeOrigin: 'EXPLICIT_GRANT',
      provenanceReference: 'fictional explicit scope', capabilityPolicyRevision: policy.expected.policyRevision,
      capabilities: ['employee.core.edit'], locationIds: [' location-a '] },
  };
  const root: Data = { kind: 'PRESENTED_PORTAL_ROOT_CURRENT_SOURCE_OBSERVATION_V2',
    selection: { locator: 'portal-tenant-01', sessionTokenHash: token, workspaceId, employeeId, databaseObservedAt: at },
    sources: { kind: 'PORTAL_POLICY_SOURCE_OBSERVATION_V1', portalSource: p, installedPolicy: policy.raw,
      verification: 'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION' },
    locationSource: { workspaceId, employeeId, primaryLocationId: ' location-a ',
      locations: [{ id: ' location-a ', workspaceId, active: true, version: at },
        { id: '位置-β', workspaceId, active: false, version: at }],
      eligibility: [{ workspaceId, employeeId, locationId: '位置-β' }] },
    verification: 'CURRENT_SOURCE_CAPTURE_NOT_PORTAL_PROOF_OR_APPROVED_ENROLLMENT' };
  return { root, p, image: loaded.image };
}
function join(f: ReturnType<typeof fixture>) { return inspectPortalCurrentIssuanceSource(f.root, f.image); }
function joined(f: ReturnType<typeof fixture>) {
  const result = join(f);
  expect(result.status).toBe('CURRENT_SOURCE_JOINED_NOT_AUTHORITY');
  if (result.status !== 'CURRENT_SOURCE_JOINED_NOT_AUTHORITY') throw new Error('source fixture denied');
  return result.observation;
}
const membership = (f: ReturnType<typeof fixture>) => data(f.root.locationSource);
function hostile(value: object) {
  let reads=0; const trap=():never=>{ reads++; throw new Error('must not inspect proxy'); };
  return { proxy:new Proxy(value,{get:trap,getPrototypeOf:trap,ownKeys:trap,getOwnPropertyDescriptor:trap}),reads:()=>reads };
}

describe('unused current Portal source join, never proof authority', () => {
  it('retains exact padded UTF8/int8/microseconds/must-change/provenance and inactive location history', () => {
    const f=fixture(), out=joined(f);
    expect(out.source.portal.employee.id).toBe(' employee-β ');
    expect(out.source.portal.portal.authorizationVersion).toBe('9223372036854775807');
    expect(out.source.portal.portal.portalAccessVersion).toBe('9007199254740993');
    expect(out.source.portal.session.createdAt).toBe(at);
    expect(out.source.portal.credential.mustChangePassword).toBe(true);
    expect(out.source.portal.portal.proofProvenance).toBe('LEGACY_UNVERIFIED');
    expect(out.sameTenantLocations[1]).toEqual({ id:'位置-β',workspaceId:data(f.root.selection).workspaceId,active:false,version:at });
    expect(out.administrativeLocationCeiling).toEqual([' location-a ']);
    expect(out.originalSessionExpiryUpperBound).toBe('2026-10-10 12:00:00.123456+00');
    for(const name of ['proof','authorityCurrent','identityVerified','effectiveCapabilities','allowedLocationIds','expiresAt']) expect(out).not.toHaveProperty(name);
  });
  it.each(['UNVERIFIED','LEGACY_UNVERIFIED','VERIFIED'])('retains %s as a label; does not turn it into approved access', value=>{
    const f=fixture();data(f.p.portal).proofProvenance=value;
    const out=joined(f);expect(out.source.portal.portal.proofProvenance).toBe(value);
    expect(out.verification).toBe('SOURCE_JOIN_NOT_PROOF_NOT_EFFECTIVE_GRANT_NOT_PROVENANCE_AUTHENTICATION');
  });
  it('keeps scheduling eligibility separate from Manager M',()=>{
    const out=joined(fixture());expect(out.employmentEligibility.map(row=>row.locationId)).toEqual(['位置-β']);
    expect(out.administrativeLocationCeiling).toEqual([' location-a ']);
  });
  it('expands explicit ALL_TENANT from T; never infers ALL from a finite equal list',()=>{
    const f=fixture(),admin=data(f.p.administrative);admin.scopeKind='ALL_TENANT';admin.scopeOrigin='LEGACY_COMPATIBILITY';admin.locationIds=[];
    expect(joined(f).administrativeLocationCeiling).toEqual([' location-a ','位置-β']);
    const g=fixture();data(g.p.administrative).locationIds=[' location-a ','位置-β'];
    expect(joined(g).source.portal.administrative?.scopeKind).toBe('LOCATIONS');
  });
  it('Owner T ignores nullable administrative scope; nonadministrative roles have no M',()=>{
    for(const role of ['OWNER','LEAD','EMPLOYEE']){
      const f=fixture();data(f.p.employee).role=role;f.p.administrative=null;
      expect(joined(f).administrativeLocationCeiling).toEqual(role==='OWNER'?[' location-a ','位置-β']:[]);
    }
  });
  it.each(['portal','workspace','employee','session'])('ineligible %s source fails before any authority mapping', site=>{
    const f=fixture();if(site==='portal')data(f.p.portal).state='SUSPENDED';
    else if(site==='session')data(f.p.session).expiresAt=at;else data(f.p[site]).active=false;
    expect(join(f)).toEqual({status:'BLOCKED',code:'SOURCE_INELIGIBLE'});
  });
  it.each(['workspaceId','employeeId','primaryLocationId'])('rejects changed native membership %s',field=>{
    const f=fixture();membership(f)[field]=' foreign ';expect(join(f).status).toBe('BLOCKED');
  });
  it.each(['workspaceId','employeeId','locationId'])('rejects NULL/foreign eligibility %s instead of silently filtering it',field=>{
    for(const value of [null,'foreign']){const f=fixture();data((membership(f).eligibility as unknown[])[0])[field]=value;expect(join(f).status).toBe('BLOCKED');}
  });
  it.each(['profile.self.read','workspace.edit'])('rejects unsupported Manager administrative grant %s',capability=>{
    const f=fixture();data(f.p.administrative).capabilities=[capability];expect(join(f)).toEqual({status:'BLOCKED',code:'SOURCE_MISMATCH'});
  });
  it('checks scope members exist in complete tenant locations; no inactive filtering or foreign fallback',()=>{
    const f=fixture();data(f.p.administrative).locationIds=['missing'];expect(join(f).status).toBe('BLOCKED');
  });
  it('rejects duplicate/out-of-byte-order source sets and sparse/inherited/accessor arrays without reads',()=>{
    for(const mode of ['duplicate','reverse','hole','inherited','accessor']){
      const f=fixture(),items=membership(f).locations as unknown[];let reads=0;
      if(mode==='duplicate')items.push(items[0]);else if(mode==='reverse')items.reverse();else if(mode==='hole')delete items[0];
      else if(mode==='inherited'){delete items[0];Object.setPrototypeOf(items,{0:items[1],length:2});}
      else Object.defineProperty(items,'0',{enumerable:true,get(){reads++;return null;}});
      expect(join(f).status).toBe('BLOCKED');expect(reads).toBe(0);
    }
  });
  it('rejects record accessors including inherited descriptor.value without invoking them',()=>{
    const f=fixture();let reads=0;
    Object.defineProperty(membership(f),'primaryLocationId',{enumerable:true,get(){reads++;return ' location-a ';}});
    const old=Object.getOwnPropertyDescriptor(Object.prototype,'value');let result:ReturnType<typeof join>;
    try{Object.defineProperty(Object.prototype,'value',{value:' location-a ',configurable:true});result=join(f);}
    finally{if(old)Object.defineProperty(Object.prototype,'value',old);else delete (Object.prototype as {value?:unknown}).value;}
    expect(result!.status).toBe('BLOCKED');expect(reads).toBe(0);
  });
  it('refuses proxy raw/image/nested/source-list before traps; cloned image has no issuance',()=>{
    for(const site of ['root','image','membership','locations']){
      const f=fixture(),h=hostile(site==='image'?f.image:site==='root'?f.root:site==='membership'?membership(f):membership(f).locations as object);
      const result=site==='image'?inspectPortalCurrentIssuanceSource(f.root,h.proxy):site==='root'?inspectPortalCurrentIssuanceSource(h.proxy,f.image):
        (site==='membership'?(f.root.locationSource=h.proxy):(membership(f).locations=h.proxy),join(f));
      expect(result.status).toBe('BLOCKED');expect(h.reads()).toBe(0);
    }
    const f=fixture();expect(inspectPortalCurrentIssuanceSource(f.root,JSON.parse(JSON.stringify(f.image))).status).toBe('BLOCKED');
  });
  it('does not accept old raw observations or caller authorityCurrent/kind substitutions',()=>{
    for(const mode of ['oldKind','authorityFlag','portalFacts','extra']){
      const f=fixture();if(mode==='oldKind')f.root.kind='PRESENTED_PORTAL_ROOT_SOURCE_OBSERVATION_V1';
      else if(mode==='portalFacts')f.root.kind='PORTAL';else f.root[mode==='extra'?'approved':'authorityCurrent']=true;
      expect(join(f).status).toBe('BLOCKED');
    }
  });
  it('requires all full installed source bytes and current incarnation/access/session tuple',()=>{
    for(const site of ['sourceBytes','incarnation','access','createdAt']){
      const f=fixture();if(site==='sourceBytes')data(data(data(f.root.sources).installedPolicy).definition).vocabularySource={encoding:'UTF8',bytesBase64:'eA==',byteLength:'1',sha256:'0'.repeat(64)};
      else data(f.p.issuance)[site==='incarnation'?'workspaceIncarnation':site==='access'?'portalAccessVersion':'sessionCreatedAt']=site==='createdAt'?'2026-10-09 12:00:00.123455+00':'1';
      expect(join(f).status).toBe('BLOCKED');
    }
  });
  it('permits only observed-time advance in final comparison and rejects source/version/set drift',()=>{
    const f=fixture(),a=joined(f);data(f.root.selection).databaseObservedAt='2026-10-09 12:00:00.123457+00';const b=joined(f);
    expect(comparePortalCurrentIssuanceSources(a,b)).toBe(true);
    data(f.root.selection).databaseObservedAt='2026-10-09 12:00:00.123455+00';expect(comparePortalCurrentIssuanceSources(a,joined(f))).toBe(false);
    data(f.p.credential).version='2026-10-09 12:00:00.123457+00';expect(comparePortalCurrentIssuanceSources(a,joined(f))).toBe(false);
    const g=fixture(),c=joined(g);membership(g).eligibility=[];expect(comparePortalCurrentIssuanceSources(c,joined(g))).toBe(false);
  });
  it('returns deeply detached immutable observations, rejects cloned/proxy output and preserves expiry without choosing TTL',()=>{
    const f=fixture(),a=joined(f);membership(f).primaryLocationId='changed';expect(a.primaryLocationId).toBe(' location-a ');
    expect(Object.isFrozen(a)).toBe(true);expect(Object.isFrozen(a.sameTenantLocations[0])).toBe(true);
    expect(isPortalCurrentIssuanceSourceObservation(a)).toBe(true);
    expect(isPortalCurrentIssuanceSourceObservation(JSON.parse(JSON.stringify(a)))).toBe(false);
    const h=hostile(a);expect(comparePortalCurrentIssuanceSources(a,h.proxy)).toBe(false);expect(h.reads()).toBe(0);
    expect(a.originalSessionExpiryUpperBound).toBe(data(f.p.session).expiresAt);
  });
});
