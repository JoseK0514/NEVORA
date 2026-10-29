import {expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {employeeMobileEvidence} from '../../scripts/employee-mobile-evidence.mjs';

it('supplies every Employee browser journey selected transitively by the full configurations',()=>{
 const root='/fictional/external-evidence',environment=employeeMobileEvidence(root,'responses');
 const required=new Set(readdirSync('src/test/integration').filter(name=>/^employee-mobile-.*\.integration\.ts$/.test(name)).flatMap(name=>[...readFileSync(join('src/test/integration',name),'utf8').matchAll(/process\.env\.(NEVORA_EMPLOYEE_[A-Z_]+_EVIDENCE)/g)].map(match=>match[1])));
 expect(required.size).toBeGreaterThanOrEqual(14);
 for(const variable of required)expect(environment[variable],variable).toMatch(/^\/fictional\/external-evidence\/responses\//);
 expect(new Set(Object.values(environment)).size).toBe(Object.keys(environment).length);
});
