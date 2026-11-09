import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {validateArchive,REVIEW_PATH} from './inspection-evidence.mjs';

function fixture(run) {
  const repo=mkdtempSync(join(tmpdir(),'nevora-review-archive-'));
  const root=join(repo,REVIEW_PATH);
  const content={'README.md':'Historical review','reports/01-first.md':'First report','reports/02-second.md':'Second report',
    'shots/example.png':'fictional image bytes','q48/probe.mjs':'throw new Error("Historical probe must never execute")'};
  for(const [path,value] of Object.entries(content)){mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),value);}
  const manifest={schema:1,root:REVIEW_PATH,sourceCommit:'a'.repeat(40),sourceTree:'b'.repeat(40),fileCount:5,reportCount:2,shotCount:1,
    files:Object.fromEntries(Object.entries(content).map(([path,value])=>[path,createHash('sha256').update(value).digest('hex')]))};
  try{run({repo,root,manifest});}finally{rmSync(repo,{recursive:true,force:true});}
}

test('verifies the full archive without executing historical probes',()=>fixture(({repo,manifest})=>{
  assert.deepEqual(validateArchive(repo,manifest),{files:5,reports:2,shots:1});
}));
test('rejects changed report or screenshot bytes',()=>fixture(({repo,root,manifest})=>{
  for(const path of ['reports/01-first.md','shots/example.png']){
    const original=readFileSync(join(root,path));
    writeFileSync(join(root,path),'changed');
    assert.throws(()=>validateArchive(repo,manifest),/Archive content changed/);
    writeFileSync(join(root,path),original);
  }
}));
test('rejects missing or unrecorded evidence',()=>fixture(({repo,root,manifest})=>{
  writeFileSync(join(root,'extra.md'),'unrecorded');
  assert.throws(()=>validateArchive(repo,manifest),/Archive inventory changed/);
  rmSync(join(root,'extra.md'));rmSync(join(root,'reports/02-second.md'));
  assert.throws(()=>validateArchive(repo,manifest),/Archive inventory changed/);
}));
test('rejects symlinks instead of following evidence outside the archive',()=>fixture(({repo,root,manifest})=>{
  rmSync(join(root,'shots/example.png'));symlinkSync(join(root,'README.md'),join(root,'shots/example.png'));
  assert.throws(()=>validateArchive(repo,manifest),/Archive contains a non-regular entry/);
}));
test('rejects unsafe manifest paths and malformed hashes',()=>fixture(({repo,manifest})=>{
  manifest.files['../outside']='c'.repeat(64);
  assert.throws(()=>validateArchive(repo,manifest),/Invalid archive manifest/);
  delete manifest.files['../outside'];manifest.files['README.md']='short';
  assert.throws(()=>validateArchive(repo,manifest),/Invalid archive manifest/);
}));
test('rejects incomplete numbered reports even when the file inventory matches',()=>fixture(({repo,manifest})=>{
  manifest.reportCount=3;
  assert.throws(()=>validateArchive(repo,manifest),/Report sequence changed/);
}));
