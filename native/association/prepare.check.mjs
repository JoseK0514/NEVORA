import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,mkdirSync,symlinkSync,rmSync,realpathSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {associationDocuments,prepareAssociations} from './prepare.mjs';

const certificate=Array.from({length:32},(_,i)=>i.toString(16).padStart(2,'0')).join(':').toUpperCase();
const configuration=()=>({origin:'https://native-staging.example.com',iosApplicationIdentifier:'AB12CD34EF.com.example.nevora',androidPackageName:'com.example.nevora',androidCertificateSha256Fingerprints:[certificate]});
const invalid=/Invalid public association configuration/;
function temporary(t){const root=realpathSync(mkdtempSync(join(tmpdir(),'nevora-association-test-')));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}

test('creates portal/auth associations for the exact supplied public app identities',()=>{
 let value;assert.doesNotThrow(()=>{value=associationDocuments(configuration());});
 assert.equal(value.origin,'https://native-staging.example.com');
 assert.deepEqual(value.apple.applinks.details[0].appIDs,['AB12CD34EF.com.example.nevora']);
 assert.deepEqual(value.apple.webcredentials.apps,['AB12CD34EF.com.example.nevora']);
 assert.deepEqual(value.apple.applinks.details[0].components,[{'/':'/app'},{'/':'/app/*'},{'/':'/activate'},{'/':'/reset-access'},{'/':'/forgot-access'},{'/':'/login'}]);
 assert.deepEqual(value.android,[{relation:['delegate_permission/common.handle_all_urls','delegate_permission/common.get_login_creds'],target:{namespace:'android_app',package_name:'com.example.nevora',sha256_cert_fingerprints:[certificate]}}]);
});
test('retains distinct rotation certificates and canonicalizes hexadecimal casing',()=>{
 const input=configuration();input.androidCertificateSha256Fingerprints=[certificate.toLowerCase(),'FF:'.repeat(31)+'FF'];
 const value=associationDocuments(input);assert.deepEqual(value.android[0].target.sha256_cert_fingerprints,[certificate,'FF:'.repeat(31)+'FF']);
});
test('rejects unknown fields including private material without reflecting it',()=>{
 for(const input of [null,[],{}, {...configuration(),privateKey:'fictional-do-not-echo'}, {...configuration(),extra:true}])assert.throws(()=>associationDocuments(input),invalid);
});
test('rejects local, credential-bearing and noncanonical association origins',()=>{
 for(const origin of ['http://native-staging.example.com','https://127.0.0.1','https://[::1]','https://localhost','https://127.1','https://0x7f000001','https://example.com.localhost','https://example.local','https://EXAMPLE.com','https://example.com.','https://example.com/','https://example.com/app','https://example.com?x=1','https://example.com#x','https://user:pass@example.com','https://example.com:443','https://example.com:8443','https://*.example.com',' https://example.com','https://example.com\\@evil.example'])assert.throws(()=>associationDocuments({...configuration(),origin}),invalid,origin);
});
test('rejects placeholders and malformed app identifiers',()=>{
 for(const iosApplicationIdentifier of ['REPLACE_TEAM_ID.com.example.nevora','AB12CD34EF','AB12CD34EF.com..nevora','ab12cd34ef.com.example.nevora','AB12CD34EF.com.example.nevora\n','AB12CD34EF.'+'a'.repeat(210)])assert.throws(()=>associationDocuments({...configuration(),iosApplicationIdentifier}),invalid);
 for(const androidPackageName of ['com','com..nevora','com.example.*','com.example.nevora\n','com.1example.nevora', 'com.'+'a'.repeat(210)])assert.throws(()=>associationDocuments({...configuration(),androidPackageName}),invalid);
});
test('rejects missing, duplicate, wildcard, malformed and oversized certificate lists',()=>{
 for(const androidCertificateSha256Fingerprints of [[],[certificate,certificate.toLowerCase()],['*'],['AA:BB'],[certificate.replaceAll(':','')],Array(5).fill(certificate),null,'not-an-array'])assert.throws(()=>associationDocuments({...configuration(),androidCertificateSha256Fingerprints}),invalid);
});
test('invalid configuration creates no output directory',t=>{
 const output=join(temporary(t),'bundle');assert.throws(()=>prepareAssociations({...configuration(),privateKey:'fictional-do-not-echo'},output),invalid);assert.equal(existsSync(output),false);
});
test('writes actual JSON files and hashes while retaining unverified external states',t=>{
 const output=join(temporary(t),'bundle');const manifest=prepareAssociations(configuration(),output);
 assert.equal(manifest.status,'prepared');assert.equal(manifest.signed,false);assert.equal(manifest.hostedVerified,false);assert.equal(manifest.deviceVerified,false);
 assert.equal(statSync(output).mode&0o777,0o700);
 for(const artifact of manifest.artifacts){const data=readFileSync(join(output,artifact.path));assert.equal(createHash('sha256').update(data).digest('hex'),artifact.sha256);assert.doesNotThrow(()=>JSON.parse(data));}
 const apple=JSON.parse(readFileSync(join(output,'.well-known/apple-app-site-association')));assert.equal(apple.webcredentials.apps[0],configuration().iosApplicationIdentifier);
 assert.equal(JSON.parse(readFileSync(join(output,'preparation.json'))).status,'prepared');assert.equal(manifest.artifacts.length,2);
});
test('refuses existing and symlink destinations without altering their contents',t=>{
 const parent=temporary(t),existing=join(parent,'existing');mkdirSync(existing);writeFileSync(join(existing,'sentinel'),'preserve');
 for(const output of [existing,join(parent,'link')]){if(output.endsWith('/link'))symlinkSync(existing,output);assert.throws(()=>prepareAssociations(configuration(),output));assert.equal(readFileSync(join(existing,'sentinel'),'utf8'),'preserve');assert.equal(existsSync(join(existing,'.well-known')),false);}
});
test('refuses relative destinations and source-tree output',()=>{
 assert.throws(()=>prepareAssociations(configuration(),'relative-output'));
 const output=fileURLToPath(new URL('./should-not-be-created',import.meta.url));assert.throws(()=>prepareAssociations(configuration(),output));assert.equal(existsSync(output),false);
});
const cli=fileURLToPath(new URL('./prepare.mjs',import.meta.url));
function run(args){return spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000,env:Object.fromEntries(['HOME','PATH','TMPDIR','LANG','LC_ALL'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]))});}
test('CLI prepares an explicitly selected public configuration',t=>{
 const parent=temporary(t),config=join(parent,'public.json'),output=join(parent,'bundle');writeFileSync(config,JSON.stringify(configuration()));const result=run(['--config',config,'--output',output]);assert.equal(result.status,0,result.stderr);assert.equal(existsSync(join(output,'.well-known/assetlinks.json')),true);assert.equal(JSON.parse(result.stdout).status,'prepared');
});
test('CLI rejects unknown, duplicate and missing arguments',t=>{
 const parent=temporary(t),config=join(parent,'public.json');writeFileSync(config,JSON.stringify(configuration()));
 for(const args of [[],['--config',config],['--config',config,'--output',join(parent,'bundle'),'--send'],['--config',config,'--config',config]])assert.equal(run(args).status,1);
});
test('CLI rejects oversized, malformed and secret-bearing inputs without reflecting them',t=>{
 const parent=temporary(t),config=join(parent,'public.json'),output=join(parent,'bundle');
 for(const contents of ['x'.repeat(8193),'{',JSON.stringify({...configuration(),privateKey:'fictional-do-not-echo'})]){writeFileSync(config,contents);const result=run(['--config',config,'--output',output]);assert.equal(result.status,1);assert.equal(result.stdout,'');assert.equal(result.stderr.includes('fictional-do-not-echo'),false);assert.equal(existsSync(output),false);}
});
