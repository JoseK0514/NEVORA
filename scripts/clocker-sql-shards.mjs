import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertSourceUnchanged,captureSource,externalEvidence} from './phase-e-owned.mjs';

const SHARDS=['1/4','2/4','3/4','4/4'];
const digest=value=>createHash('sha256').update(value).digest('hex');
export const clockerSourceHash=custody=>digest(JSON.stringify(Object.entries(custody.hashes).sort(([a],[b])=>a<b?-1:a>b?1:0)));

export function parseClockerArguments(args){
 const shardArgs=args.filter(arg=>arg.startsWith('--shard'));
 assert(shardArgs.length<=1,'Only one Clocker SQL shard may be selected');
 const shard=shardArgs[0]?.slice('--shard='.length);
 if(shardArgs.length)assert(shardArgs[0]==='--shard='+shard&&SHARDS.includes(shard),'Select one of the four balanced Clocker SQL groups');
 const selections=args.filter(arg=>!arg.startsWith('--shard'));
 assert(selections.length<=1,'Unexpected Clocker runner arguments');
 assert(!shard||!selections.length,'Sharding requires the complete original Clocker SQL configuration');
 return {selection:selections[0],shard};
}

export function expectedClockerFiles(source){
 const directory=join(source,'src/test/integration');
 const files=readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isFile()&&/^clocker-.*\.integration\.ts$/.test(entry.name)).map(entry=>'src/test/integration/'+entry.name);
 const release='src/test/integration/phase-c-release-migrations.integration.ts';
 assert(existsSync(join(source,release)),'Missing Clocker release migration fixture');
 return [...files,release].sort();
}

export function verifyClockerAllocation(allocation,expectedFiles){
 assert(allocation?.schema===1&&allocation.shards,'Invalid Clocker SQL allocation');
 assert.deepEqual(Object.keys(allocation.shards).sort(),SHARDS,'Every balanced Clocker SQL group is required');
 const allowed=new Set(expectedFiles),seen=new Set(),groups={};
 for(const shard of SHARDS){
  const files=allocation.shards[shard];
  assert(Array.isArray(files)&&files.length>0,'Empty Clocker SQL allocation group');
  for(const file of files){assert(typeof file==='string'&&allowed.has(file)&&!seen.has(file),'Duplicate or foreign Clocker SQL allocation');seen.add(file);}
  groups[shard]=[...files].sort();
 }
 assert.deepEqual([...seen].sort(),[...expectedFiles].sort(),'Clocker SQL allocation omits source files');
 return groups;
}
function loadAllocation(source){
 return readJson(join(source,'scripts/clocker-sql-shards.json'));
}

export function validateClockerReport(report,source,expectedFiles){
 assert(report?.success===true,'Clocker SQL report did not succeed');
 assert(Number.isSafeInteger(report.numTotalTests)&&report.numTotalTests>0,'Empty Clocker SQL execution');
 assert(report.numPassedTests===report.numTotalTests&&!report.numFailedTests&&!report.numPendingTests&&!report.numTodoTests,'Clocker SQL execution contains failed or skipped tests');
 assert(Array.isArray(report.testResults)&&report.testResults.length>0,'Missing Clocker SQL files');
 const files=[],allowed=new Set(expectedFiles);
 let tests=0;
 for(const result of report.testResults){
  assert(result?.status==='passed'&&typeof result.name==='string','Failed Clocker SQL file');
  const file=relative(source,result.name).split('\\').join('/');
  assert(!isAbsolute(file)&&!file.split('/').includes('..')&&allowed.has(file),'Unexpected Clocker SQL file');
  assert(!files.includes(file),'Duplicate Clocker SQL file');
  assert(Array.isArray(result.assertionResults)&&result.assertionResults.length>0,'Empty Clocker SQL file');
  for(const item of result.assertionResults)assert(item.status==='passed'&&typeof item.fullName==='string'&&item.fullName.trim(),'Failed, skipped or unidentified Clocker SQL case');
  tests+=result.assertionResults.length;files.push(file);
 }
 assert(tests===report.numTotalTests,'Clocker SQL test counts do not match');
 return {files:files.sort(),tests};
}

export function verifyClockerNeeds(needs){
 assert(needs&&Object.keys(needs).length===1&&needs['clocker-postgres-suite']?.result==='success','All Clocker SQL group jobs must succeed');
}

export function verifyClockerShardSet(leaves,{custody,source,expectedFiles,needs,allocation}){
 verifyClockerNeeds(needs);
 assert(Array.isArray(leaves)&&leaves.length===SHARDS.length,'All four Clocker SQL shard receipts are required');
 assert(expectedFiles.length>0&&new Set(expectedFiles).size===expectedFiles.length,'Invalid Clocker SQL source inventory');
 const groups=verifyClockerAllocation(allocation,expectedFiles);
 const seen=new Set(),covered=new Set();
 let tests=0;
 for(const {receipt,report,manifest} of leaves){
  assert(receipt?.schema===1&&SHARDS.includes(receipt.shard)&&!seen.has(receipt.shard),'Missing, duplicate or unexpected Clocker shard');
  seen.add(receipt.shard);
  assert(receipt.status==='passed'&&receipt.exitCode===0&&receipt.sourceClean===true&&receipt.ownedClusterClosed===true,'Clocker SQL shard did not complete cleanly');
  assert(receipt.checkpoint===custody.checkpoint&&receipt.tree===custody.tree&&receipt.sourceHash===clockerSourceHash(custody),'Clocker shard source does not match the candidate');
  assert(manifest?.sourceClean===true&&manifest.checkpoint===custody.checkpoint&&manifest.tree===custody.tree&&clockerSourceHash(manifest)===clockerSourceHash(custody),'Clocker shard source manifest changed or is missing');
  assert(receipt.reportHash===digest(JSON.stringify(report)),'Clocker shard report changed');
  const actual=validateClockerReport(report,source,expectedFiles);
  assert.deepEqual(actual.files,groups[receipt.shard],'Clocker SQL execution does not match its balanced allocation');
  assert.deepEqual(receipt.files,actual.files,'Clocker shard file receipt changed');
  assert.equal(receipt.tests,actual.tests,'Clocker shard case receipt changed');
  for(const file of actual.files){assert(!covered.has(file),'Clocker shards overlap');covered.add(file);}
  tests+=actual.tests;
 }
 assert.deepEqual([...seen].sort(),SHARDS,'Missing Clocker SQL shard');
 assert.deepEqual([...covered].sort(),[...expectedFiles].sort(),'Clocker shards omitted or substituted source files');
 return {files:[...covered].sort(),tests};
}

export function beginClockerShard(shard){
 assert(SHARDS.includes(shard),'Invalid Clocker shard');
 const source=resolve(process.cwd()),custody=captureSource(source,process.env.CLOCKER_SQL_EXPECTED_SHA);
 const evidence=externalEvidence(source,process.env.CLOCKER_SQL_EVIDENCE_DIR);
 writeFileSync(join(evidence,'source-manifest.json'),JSON.stringify(custody,null,2));
 const files=verifyClockerAllocation(loadAllocation(source),expectedClockerFiles(source))[shard];
 return {source,custody,evidence,shard,files,reportPath:join(evidence,'vitest-report.json')};
}

export function finishClockerShard(context,exitCode,ownedClusterClosed){
 const {source,custody,evidence,shard}=context;
 let report,actual,error;
 try{
  assert(exitCode===0&&ownedClusterClosed===true,'Clocker SQL command or owned teardown failed');
  assertSourceUnchanged(source,custody);
  report=JSON.parse(readFileSync(context.reportPath,'utf8'));
  actual=validateClockerReport(report,source,expectedClockerFiles(source));
  assert.deepEqual(actual.files,context.files,'Clocker SQL command omitted or added allocated files');
 }catch(value){error=value.message;}
 const receipt={schema:1,shard,checkpoint:custody.checkpoint,tree:custody.tree,sourceHash:clockerSourceHash(custody),sourceClean:custody.sourceClean,ownedClusterClosed,exitCode,status:error?'failed':'passed',files:actual?.files??[],tests:actual?.tests??0,reportHash:report?digest(JSON.stringify(report)):null,error:error??null};
 writeFileSync(join(evidence,'clocker-shard-receipt.json'),JSON.stringify(receipt,null,2));
 if(error)throw Error(error);
 return receipt;
}

function readJson(path){
 const metadata=lstatSync(path);assert(metadata.isFile()&&!metadata.isSymbolicLink(),'Invalid Clocker shard evidence file');
 return JSON.parse(readFileSync(path,'utf8'));
}
function aggregate(){
 const source=resolve(process.cwd()),custody=captureSource(source,process.env.CLOCKER_SQL_EXPECTED_SHA);
 const root=resolve(process.env.CLOCKER_SQL_ARTIFACTS_DIR??'');
 assert(process.env.CLOCKER_SQL_ARTIFACTS_DIR&&root!==source,'Select downloaded Clocker SQL artifacts');
 const names=SHARDS.map((_,index)=>'clocker-sql-'+custody.checkpoint+'-'+(index+1)+'-of-4');
 const entries=readdirSync(root,{withFileTypes:true});
 assert(entries.every(entry=>entry.isDirectory()&&!entry.isSymbolicLink()),'Unexpected Clocker artifact entry');
 assert.deepEqual(entries.map(entry=>entry.name).sort(),names.sort(),'Missing or foreign Clocker shard artifacts');
 const leaves=names.map(name=>({receipt:readJson(join(root,name,'clocker-shard-receipt.json')),report:readJson(join(root,name,'vitest-report.json')),manifest:readJson(join(root,name,'source-manifest.json'))}));
 const actual=verifyClockerShardSet(leaves,{custody,source,expectedFiles:expectedClockerFiles(source),allocation:loadAllocation(source),needs:JSON.parse(process.env.CLOCKER_SQL_CI_NEEDS_JSON??'null')});
 const evidence=externalEvidence(source,process.env.CLOCKER_SQL_EVIDENCE_DIR);
 writeFileSync(join(evidence,'clocker-sql-aggregate.json'),JSON.stringify({schema:1,checkpoint:custody.checkpoint,tree:custody.tree,sourceHash:clockerSourceHash(custody),status:'passed',shards:SHARDS,...actual},null,2));
 console.log('PASS: all four Clocker SQL groups, '+actual.files.length+' source files and '+actual.tests+' executed cases verified.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{assert(process.argv.length===3&&process.argv[2]==='aggregate','Expected Clocker aggregate command');aggregate();}
 catch(error){console.error(error.message);process.exitCode=1;}
}
