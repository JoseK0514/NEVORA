/** Read-only classification of supplied executed reports; output is exclusive. */
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,isAbsolute} from 'node:path';
import {summarizePartnerAssertions} from '../src/test/integration/owner-advisor-partner-evidence';
const [output,...inputs]=process.argv.slice(2);
if(!output||!isAbsolute(output)||!inputs.length||resolve(output).startsWith(process.cwd()+'/'))throw Error('Provide fresh absolute external output and executed Vitest JSON reports');
const reports=await Promise.all(inputs.map(async path=>{const bytes=await readFile(path,'utf8');return {path:resolve(path),hash:createHash('sha256').update(bytes).digest('hex'),report:JSON.parse(bytes)};}));
const cases=summarizePartnerAssertions(reports.map(r=>r.report));
await writeFile(output,JSON.stringify({sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),inputs:reports.map(({path,hash})=>({path,hash})),layer:'deterministic-preflight',cases,actualModelSamples:0,modelQuality:'not-assessed',limitations:'Assertions establish application contracts, fixture facts and transport guards, not semantic answer quality. Scripted samples and browser API fixtures have separate reports.'},null,2),{flag:'wx',mode:0o600});
if(cases.some(c=>c.status!=='passed'))process.exitCode=1;
