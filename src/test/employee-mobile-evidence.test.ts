import {beforeAll,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {employeeMobileEvidence} from '../../scripts/employee-mobile-evidence.mjs';

let coverage:{configurations:unknown[];selected:string[];missing:unknown[];contracts:{file:string}[];distinctFiles:number};
beforeAll(()=>{coverage=JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/employee-mobile-configuration-coverage.mjs'],{encoding:'utf8',maxBuffer:16*1024*1024}));});

it('supplies every Employee browser journey selected transitively by the full configurations',()=>{
 const root='/fictional/external-evidence',environment=employeeMobileEvidence(root,'responses');
 const files=new Set([...readdirSync('src/test/integration').filter(name=>/^employee-mobile-.*\.integration\.ts$/.test(name)).map(name=>join('src/test/integration',name)),...coverage.contracts.map(row=>row.file)]);
 const required=new Set([...files].flatMap(file=>[...readFileSync(file,'utf8').matchAll(/process\.env\.([A-Z_]*EVIDENCE[A-Z_]*)/g)].map(match=>match[1])));
 expect(required.size).toBeGreaterThanOrEqual(16);
 for(const variable of required)expect(environment[variable],variable).toMatch(/^\/fictional\/external-evidence\/responses\//);
 expect(new Set(Object.values(environment)).size).toBe(Object.keys(environment).length);
});

it('complete selected configurations cover all13 effective execution specifications without dropping a file contract',()=>{
 expect(coverage.configurations).toHaveLength(13);expect(coverage.selected).toEqual(['device-alerts','phase1','deletion','pay']);expect(coverage.missing).toEqual([]);expect(coverage.distinctFiles).toBeGreaterThanOrEqual(36);
});
