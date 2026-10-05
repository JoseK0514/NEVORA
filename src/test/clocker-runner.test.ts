import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

it('refuses an application DATABASE_URL before attempting owned Clocker tests', () => {
  const result=spawnSync(process.execPath,['scripts/phase-c-clocker-postgres.mjs'],{
    encoding:'utf8',timeout:5000,
    env:{...process.env,DATABASE_URL:'postgresql://fixture.invalid/forbidden'},
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Unset DATABASE_URL');
});

it('stops a partially started owned PostgreSQL cluster before deleting its files', () => {
  // Real subprocess, fake executable boundary: no external or shared server touched.
  const fixture=mkdtempSync(join(tmpdir(),'nevora-clocker-runner-test-'));
  const trace=join(fixture,'trace.txt');
  try {
    writeFileSync(join(fixture,'initdb'),`#!${process.execPath}\nconst fs=require('node:fs');const p=require('node:path');const a=process.argv;fs.mkdirSync(a[a.indexOf('-D')+1],{recursive:true});\n`,{mode:0o700});
    writeFileSync(join(fixture,'pg_ctl'),`#!${process.execPath}\nconst fs=require('node:fs');const p=require('node:path');const a=process.argv;const d=a[a.indexOf('-D')+1];const t=process.env.CLOCKER_RUNNER_TEST_TRACE;if(a.includes('start')){fs.writeFileSync(p.join(d,'postmaster.pid'),'test-owned');fs.appendFileSync(t,'DATA='+d+'\\n');process.exit(1);}if(a.includes('stop')){fs.appendFileSync(t,'STOP\\n');fs.rmSync(p.join(d,'postmaster.pid'));process.exit(0);}process.exit(2);\n`,{mode:0o700});
    const env: NodeJS.ProcessEnv={...process.env,NEVORA_TEST_PG_BIN:fixture,CLOCKER_RUNNER_TEST_TRACE:trace};
    delete env.DATABASE_URL;
    const result=spawnSync(process.execPath,[resolve('scripts/phase-c-clocker-postgres.mjs')],{encoding:'utf8',timeout:5000,env});
    expect(result.status).not.toBe(0);
    const log=readFileSync(trace,'utf8');
    expect(log).toContain('STOP');
    const data=log.split('\n').find(line=>line.startsWith('DATA='))!.slice(5);
    expect(existsSync(data)).toBe(false);
  } finally { rmSync(fixture,{recursive:true,force:true}); }
});
