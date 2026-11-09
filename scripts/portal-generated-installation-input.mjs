// UNUSED source candidate: scripts/portal-generated-installation-input.mjs.
// Fixed no-argument source-coherence consumer for existing release-build only.
// It does not authenticate installer/lease/live DB/build execution or issue proof.
import {createHash} from 'node:crypto';
import {constants,openSync,closeSync,fstatSync,lstatSync,readFileSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const installationPath='src/lib/tenancy/runtime/portal-native-installation.generated.json';
const imagePath='src/lib/tenancy/runtime/portal-source-image.generated.ts';
const producerPath='src/lib/tenancy/runtime/portal-native-installation-producer.server.ts';
const capturePath='src/lib/tenancy/runtime/portal-native-installation-capture.server.ts';
const instrumentationSourceSha256="9a483af0104831eaf399a7704fc7808b991d68362dbc28905f3a2038e5460ba4";
const bootstrapSourceSha256="1ad06d1b6e1660c1a48bfb724d9a8326424d68182b360c397c9546c2ad4142fb";
const fenceSourceSha256="2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f";
const fenceProtocolSha256="f433a46cf53b69cd1bac000fb702c2586efd3b76abb57d51aab3a037ce1b7819";
const fail=()=>{throw Error('portal_generated_installation_build_input_unavailable');};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const own=(r,k)=>Object.hasOwn(r,k);
const slots=Object.freeze({resolverSource:'src/lib/tenancy/resolve.server.ts',rootSourceInspectorSource:'src/lib/tenancy/runtime/portal-root-source-observation.ts',portalBindingSource:'src/lib/tenancy/runtime/portal-source-binding.ts',installedPolicyInspectorSource:'src/lib/tenancy/runtime/installed-policy-observation.ts',canonicalPolicySource:'src/lib/capabilities/policy.ts',vocabularySource:'src/lib/capabilities/types.ts',approvedPRDSource:'docs/architecture/phase-f-approved-prd.md',auditedRoleGuardSource:'src/lib/tenancy/runtime/audited-role-guard.sql',originalRuntimeLoginSource:'src/lib/tenancy/runtime/original-runtime-login.sql',nativeGraphPlanSource:'src/lib/tenancy/runtime/portal-runtime-startup-graph.sql'});
const files=Object.freeze({auditedRoleGuardInstallerSource:'audited-role-guard-installer.sql',originalRuntimeLoginInstallerSource:'original-runtime-login-installer.sql',portalSourceLocksSource:'portal-source-locks.sql',portalSourceObservationSource:'portal-source-observation.sql',portalInstalledPolicyObservationSource:'portal-installed-policy-observation.sql',portalPolicyJointLocksSource:'portal-policy-joint-locks.sql',portalPolicyJointObservationSource:'portal-policy-joint-observation.sql',privateEnrollmentCaptureSource:'portal-native-installation-capture.server.ts'});
function read(path,privateMode=false){
 if(realpathSync(root)!==root||lstatSync(root).isSymbolicLink())return fail();let file=root;
 for(const part of path.split('/')){if(!part||part==='.'||part==='..')return fail();file=join(file,part);if(lstatSync(file).isSymbolicLink()||realpathSync(file)!==file)return fail();}
 const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const a=fstatSync(fd),raw=readFileSync(fd),b=fstatSync(fd),named=lstatSync(file);
  if(!a.isFile()||a.nlink!==1||a.uid!==process.getuid?.()||(privateMode&&(a.mode&0o777)!==0o600)||a.dev!==b.dev||a.ino!==b.ino||a.size!==b.size||a.ctimeMs!==b.ctimeMs||a.mtimeMs!==b.mtimeMs||raw.length!==b.size||named.isSymbolicLink()||named.dev!==b.dev||named.ino!==b.ino)return fail();
  return raw;
 }finally{closeSync(fd);}
}
function present(path){try{lstatSync(join(root,path));return true;}catch(error){if(error instanceof Error&&Object.getOwnPropertyDescriptor(error,'code')?.value==='ENOENT')return false;return fail();}}
function utf8(raw){const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);if(!Buffer.from(text).equals(raw)||text.includes('\0'))return fail();return text;}
function exact(value,names){if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==names.length||names.some(name=>!own(value,name)))return fail();return value;}
function bytes(value){if(!Array.isArray(value)||!value.length||value.some(v=>typeof v!=='number'||!Number.isInteger(v)||v<0||v>255))return fail();const raw=Buffer.from(value);utf8(raw);return raw;}
function literal(source,name){const marker='const '+name+' = ';if(source.split(marker).length!==2)return fail();const start=source.indexOf(marker)+marker.length,end=source.indexOf(';\n',start);if(end<start)return fail();const value=JSON.parse(source.slice(start,end));if(typeof value!=='string'||!value.length)return fail();return value;}
function oid(value){if(typeof value!=='string'||!/^[1-9][0-9]*$/.test(value)||BigInt(value)>4294967295n)return fail();return value;}
/** Legacy release-build returns unchanged when neither startup source exists.
 * Once either fixed startup path exists, all generated/dependency/source inputs
 * must exist coherently. No env flag, CLI approval/path, DB lookup or write.
 */
export function assertPortalGeneratedInstallationBuildInput(){
 const instrumentation=present('src/instrumentation.ts'),bootstrap=present('src/lib/tenancy/runtime/portal-runtime-build-install-bootstrap.server.ts');
 if(!instrumentation&&!bootstrap){if(present(installationPath))return fail();return Object.freeze({status:'LEGACY_BUILD_NO_PORTAL_STARTUP_BINDING'});}
 if(!instrumentation||!bootstrap||present('.next'))return fail();
 if(hash(read('src/instrumentation.ts'))!==instrumentationSourceSha256||hash(read('src/lib/tenancy/runtime/portal-runtime-build-install-bootstrap.server.ts'))!==bootstrapSourceSha256)return fail();
 const raw=read(installationPath,true),text=utf8(raw),installation=exact(JSON.parse(text),['format','sourceImageSha256','producerSourceBytes','installationSourceBundle','catalogFenceProtocolSha256','startup','privateEnrollment']);
 if(JSON.stringify(installation)+'\n'!==text||installation.format!=='PORTAL_NATIVE_INSTALLATION_RETAINED_V1')return fail();
 const producer=read(producerPath),image=read(imagePath),capture=read(capturePath);
 if(!bytes(installation.producerSourceBytes).equals(producer)||installation.sourceImageSha256!==hash(image))return fail();
 const imageText=utf8(image),begin='/* PORTAL_IMAGE_BEGIN */',end='/* PORTAL_IMAGE_END */';
 if(imageText.split(begin).length!==2||imageText.split(end).length!==2||imageText.indexOf(end)<=imageText.indexOf(begin))return fail();
 const encoded=exact(JSON.parse(imageText.slice(imageText.indexOf(begin)+begin.length,imageText.indexOf(end))),['format',...Object.keys(slots)]);
 if(encoded.format!=='PORTAL_RUNTIME_SOURCE_IMAGE_BASE64_V1')return fail();
 const imageInput={format:'PORTAL_RUNTIME_SOURCE_IMAGE_BASE64_V1'};
 for(const [name,path]of Object.entries(slots)){if(typeof encoded[name]!=='string'||!encoded[name])return fail();const source=Buffer.from(encoded[name],'base64');if(source.toString('base64')!==encoded[name]||!source.equals(read(path)))return fail();utf8(source);imageInput[name]=encoded[name];}
 if(hash(read(slots.approvedPRDSource))!=='35e4084c2c365777c78f0d1e2e65533b06758c1f3062cf1b10feb539af8bf7a7')return fail();
 const expectedImage='// Generated from fixed retained inputs BEFORE existing clean release build.\n// Exact preimages/source binding only; no install/reviewer/tenant authority.\nconst PORTAL_SOURCE_IMAGE_BASE64 = /* PORTAL_IMAGE_BEGIN */'+JSON.stringify(imageInput)+'/* PORTAL_IMAGE_END */ as const;\nexport const PORTAL_SOURCE_IMAGE_BYTES = Object.freeze(Object.fromEntries(Object.entries(PORTAL_SOURCE_IMAGE_BASE64).map(([name,value]) =>\n  name === "format" ? [name,"PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1"] : [name,Object.freeze([...Buffer.from(value,"base64")])])));\n';
 if(imageText!==expectedImage)return fail();
 const bundle=exact(installation.installationSourceBundle,[...Object.keys(files),'resolvePortalSource','privatePoliciesTemplateSource','privateGrantsTemplateSource','privatePoliciesRenderedSource','privateGrantsRenderedSource']);
 for(const [name,path]of Object.entries(files))if(!bytes(bundle[name]).equals(read('src/lib/tenancy/runtime/'+path)))return fail();
 if(!bytes(bundle.privateEnrollmentCaptureSource).equals(capture))return fail();
 const producerText=utf8(producer);
 for(const [name,label]of [['resolvePortalSource','ROOT_SOURCE'],['privatePoliciesTemplateSource','POLICIES_TEMPLATE'],['privateGrantsTemplateSource','GRANTS_TEMPLATE']])if(utf8(bytes(bundle[name]))!==literal(producerText,label))return fail();
 const startup=exact(installation.startup,['format','databaseOid','rootOid','ownerOid','rootDefinition','rootDefinitionSha256','nativeAuditCapsuleText','nativeAuditCapsuleSha256','canonicalPolicySource','vocabularySource','approvedPRDSource']);
 if(startup.format!=='PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1')return fail();for(const name of ['databaseOid','rootOid','ownerOid'])oid(startup[name]);
 for(const [name,digest]of [['rootDefinition','rootDefinitionSha256'],['nativeAuditCapsuleText','nativeAuditCapsuleSha256']])if(typeof startup[name]!=='string'||!startup[name]||hash(Buffer.from(startup[name]))!==startup[digest])return fail();
 for(const name of ['canonicalPolicySource','vocabularySource','approvedPRDSource'])if(startup[name]!==utf8(read(slots[name])))return fail();
 const enrollment=exact(installation.privateEnrollment,['format','nativeCatalogCapsuleText','nativeCatalogCapsuleSha256']);
 if(enrollment.format!=='PORTAL_PRIVATE_READER_ENROLLMENT_SOURCE_V1'||typeof enrollment.nativeCatalogCapsuleText!=='string'||!enrollment.nativeCatalogCapsuleText||hash(Buffer.from(enrollment.nativeCatalogCapsuleText))!==enrollment.nativeCatalogCapsuleSha256)return fail();
 // The existing build binding/bootstrap additionally checks the full catalog
 // fence protocol and rendered owner enrollment/current native capsules. No
 // arbitrary source format is treated as installer approval by this consumer.
 if(hash(read('src/lib/tenancy/runtime/catalog-fence.server.ts'))!==fenceSourceSha256||installation.catalogFenceProtocolSha256!==fenceProtocolSha256)return fail();
 const capsule=JSON.parse(enrollment.nativeCatalogCapsuleText);
 if(!capsule||typeof capsule!=='object'||capsule.databaseOid!==startup.databaseOid||typeof capsule.installationCatalogText!=='string')return fail();
 const catalog=JSON.parse(capsule.installationCatalogText);
 if(!catalog||!Array.isArray(catalog.roles))return fail();
 // Postgres to_jsonb(pg_roles) retains OIDs as canonical text, matching the
 // complete native capsule. Numeric/coerced values are not native preimages.
 const owners=catalog.roles.filter(role=>role&&typeof role==='object'&&typeof role.oid==='string'&&/^[1-9][0-9]{0,9}$/.test(role.oid)&&BigInt(role.oid)<=4294967295n&&role.oid===startup.ownerOid);
 if(owners.length!==1||typeof owners[0].rolname!=='string'||!owners[0].rolname||owners[0].rolname.includes('\0'))return fail();
 const quoted='"'+owners[0].rolname.replaceAll('"','""')+'"';
 for(const [template,rendered]of [['privatePoliciesTemplateSource','privatePoliciesRenderedSource'],['privateGrantsTemplateSource','privateGrantsRenderedSource']]){
  const expected=utf8(bytes(bundle[template])).replaceAll('"__BOUND_PORTAL_READER_OWNER__"',quoted);
  if(expected.includes('"__BOUND_PORTAL_READER_OWNER__"')||expected!==utf8(bytes(bundle[rendered])))return fail();
 }
 return Object.freeze({status:'GENERATED_INSTALLATION_SOURCE_COHERENT_NOT_AUTHORITY',installationSha256:hash(raw),sourceImageSha256:hash(image),byteLength:raw.length});
}
