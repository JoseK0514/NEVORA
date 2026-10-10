// Inert source-coherence regressions against the existing no-argument consumer.
// Fictional metadata and exact source preimages only: no native installation,
// executing build, credentials, database, tenant proof, or installer authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chmodSync,mkdtempSync,mkdirSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtime='src/lib/tenancy/runtime/';
const installationPath=runtime+'portal-native-installation.generated.json';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const slots={resolverSource:'src/lib/tenancy/resolve.server.ts',rootSourceInspectorSource:runtime+'portal-root-source-observation.ts',portalBindingSource:runtime+'portal-source-binding.ts',installedPolicyInspectorSource:runtime+'installed-policy-observation.ts',canonicalPolicySource:'src/lib/capabilities/policy.ts',vocabularySource:'src/lib/capabilities/types.ts',approvedPRDSource:'docs/architecture/phase-f-approved-prd.md',auditedRoleGuardSource:runtime+'audited-role-guard.sql',originalRuntimeLoginSource:runtime+'original-runtime-login.sql',nativeGraphPlanSource:runtime+'portal-runtime-startup-graph.sql'};
const files={auditedRoleGuardInstallerSource:'audited-role-guard-installer.sql',originalRuntimeLoginInstallerSource:'original-runtime-login-installer.sql',portalSourceLocksSource:'portal-source-locks.sql',portalSourceObservationSource:'portal-source-observation.sql',portalInstalledPolicyObservationSource:'portal-installed-policy-observation.sql',portalPolicyJointLocksSource:'portal-policy-joint-locks.sql',portalPolicyJointObservationSource:'portal-policy-joint-observation.sql',privateEnrollmentCaptureSource:'portal-native-installation-capture.server.ts'};
function put(root,path,raw,mode=0o600){const file=join(root,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,raw,{mode});}
function literal(source,label){const marker='const '+label+' = ';assert.equal(source.split(marker).length,2);const begin=source.indexOf(marker)+marker.length;return JSON.parse(source.slice(begin,source.indexOf(';\n',begin)));}
async function fixture(change=()=>{}){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'nevora-portal-source-coherence-')));chmodSync(root,0o700);
 try{
  const paths=['scripts/portal-generated-installation-input.mjs','src/instrumentation.ts',runtime+'portal-runtime-build-install-bootstrap.server.ts',runtime+'portal-native-installation-producer.server.ts',runtime+'portal-source-image.generated.ts',runtime+'catalog-fence.server.ts',...Object.values(slots),...Object.values(files).map(name=>runtime+name)];
  // Fixed inert text preimages are never installed into application startup.
  const fixtureSources={'src/instrumentation.ts':'scripts/fixtures/portal-build-startup/instrumentation.ts.txt',[runtime+'portal-runtime-build-install-bootstrap.server.ts']:'scripts/fixtures/portal-build-startup/portal-runtime-build-install-bootstrap.server.ts.txt'};
  for(const path of new Set(paths))put(root,path,readFileSync(join(app,fixtureSources[path]??path)));
  const producer=readFileSync(join(root,runtime+'portal-native-installation-producer.server.ts'));
  const bundle=Object.fromEntries(Object.entries(files).map(([name,path])=>[name,[...readFileSync(join(root,runtime+path))]]));
  for(const [name,label]of [['resolvePortalSource','ROOT_SOURCE'],['privatePoliciesTemplateSource','POLICIES_TEMPLATE'],['privateGrantsTemplateSource','GRANTS_TEMPLATE']])bundle[name]=[...Buffer.from(literal(producer.toString('utf8'),label))];
  const ownerName='fictional_source_reader';
  for(const [template,rendered]of [['privatePoliciesTemplateSource','privatePoliciesRenderedSource'],['privateGrantsTemplateSource','privateGrantsRenderedSource']])bundle[rendered]=[...Buffer.from(Buffer.from(bundle[template]).toString('utf8').replaceAll('"__BOUND_PORTAL_READER_OWNER__"','"'+ownerName+'"'))];
  const catalog={roles:[{oid:'42',rolname:ownerName}]};
  change(catalog);
  const capsule=JSON.stringify({databaseOid:'41',installationCatalogText:JSON.stringify(catalog)});
  const definition='-- FICTIONAL INERT SOURCE COHERENCE ONLY';
  const audit='{"fictionalSourceCoherenceOnly":true}';
  const startup={format:'PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1',databaseOid:'41',rootOid:'43',ownerOid:'42',rootDefinition:definition,rootDefinitionSha256:hash(Buffer.from(definition)),nativeAuditCapsuleText:audit,nativeAuditCapsuleSha256:hash(Buffer.from(audit)),...Object.fromEntries(['canonicalPolicySource','vocabularySource','approvedPRDSource'].map(name=>[name,readFileSync(join(root,slots[name]),'utf8')]))};
  const installation={format:'PORTAL_NATIVE_INSTALLATION_RETAINED_V1',sourceImageSha256:hash(readFileSync(join(root,runtime+'portal-source-image.generated.ts'))),producerSourceBytes:[...producer],installationSourceBundle:bundle,catalogFenceProtocolSha256:'f433a46cf53b69cd1bac000fb702c2586efd3b76abb57d51aab3a037ce1b7819',startup,privateEnrollment:{format:'PORTAL_PRIVATE_READER_ENROLLMENT_SOURCE_V1',nativeCatalogCapsuleText:capsule,nativeCatalogCapsuleSha256:hash(Buffer.from(capsule))}};
  put(root,installationPath,JSON.stringify(installation)+'\n');
  const consumer=await import(pathToFileURL(join(root,'scripts/portal-generated-installation-input.mjs')).href);
  return {root,consumer,close(){rmSync(root,{recursive:true,force:true});}};
 }catch(error){rmSync(root,{recursive:true,force:true});throw error;}
}
test('canonical native OID text is source coherent without implying authority',async()=>{
 const f=await fixture();try{const result=f.consumer.assertPortalGeneratedInstallationBuildInput();assert.equal(result.status,'GENERATED_INSTALLATION_SOURCE_COHERENT_NOT_AUTHORITY');assert.equal(result.installationSha256,hash(readFileSync(join(f.root,installationPath))));}finally{f.close();}
});
for(const [label,value]of [['numeric OID',42],['zero text','0'],['leading zero text','042'],['negative text','-42'],['fractional text','42.0'],['exponent text','4.2e1'],['overflow text','4294967296'],['whitespace text',' 42'],['coerced array',['42']]])test('consumer rejects '+label,async()=>{
 const f=await fixture(catalog=>{catalog.roles[0].oid=value;});try{assert.throws(()=>f.consumer.assertPortalGeneratedInstallationBuildInput(),/portal_generated_installation_build_input_unavailable/);}finally{f.close();}
});
test('consumer rejects duplicate canonical owner entries',async()=>{
 const f=await fixture(catalog=>{catalog.roles.push({...catalog.roles[0]});});try{assert.throws(()=>f.consumer.assertPortalGeneratedInstallationBuildInput(),/portal_generated_installation_build_input_unavailable/);}finally{f.close();}
});
test('consumer rejects rendered owner disagreement',async()=>{
 const f=await fixture(catalog=>{catalog.roles[0].rolname='another_fictional_source_reader';});try{assert.throws(()=>f.consumer.assertPortalGeneratedInstallationBuildInput(),/portal_generated_installation_build_input_unavailable/);}finally{f.close();}
});
test('consumer preserves legacy result only when all startup input paths are absent',async()=>{
 const f=await fixture();try{for(const path of ['src/instrumentation.ts',runtime+'portal-runtime-build-install-bootstrap.server.ts',installationPath])rmSync(join(f.root,path));assert.deepEqual(f.consumer.assertPortalGeneratedInstallationBuildInput(),{status:'LEGACY_BUILD_NO_PORTAL_STARTUP_BINDING'});}finally{f.close();}
});
test('consumer rejects partial startup input before considering metadata',async()=>{
 const f=await fixture();try{rmSync(join(f.root,'src/instrumentation.ts'));assert.throws(()=>f.consumer.assertPortalGeneratedInstallationBuildInput(),/portal_generated_installation_build_input_unavailable/);}finally{f.close();}
});
