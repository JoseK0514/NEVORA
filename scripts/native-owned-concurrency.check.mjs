import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fork,execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativeEnvironment} from './native-owned.mjs';

test('two actual owned PostgreSQL invocations retain different live ports, data and evidence', {timeout:90000,skip:!process.env.NEVORA_TEST_PG_BIN}, async()=>{
  const source=realpathSync(mkdtempSync(join(tmpdir(),'native-concurrency-source-'))),children=[];
  const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
  try{
    git('init','--quiet');writeFileSync(join(source,'fixture.txt'),'owned concurrency only\n');git('add','fixture.txt');
    git('-c','user.name=Native fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture');
    const sha=git('rev-parse','HEAD');
    const launch=()=>{
      const child=fork(fileURLToPath(new URL('./native-owned.mjs',import.meta.url)),['--mode','owned-local','--expected-sha',sha,'--ownership-only'],
        {cwd:source,env:nativeEnvironment(),stdio:['ignore','pipe','pipe','ipc']});
      let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
      const exited=new Promise(ready=>child.once('exit',(code,signal)=>ready({code,signal,output})));
      const ready=new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(Error('Owned PostgreSQL concurrency readiness timeout: '+output)),60000);
        child.once('error',error=>{clearTimeout(timeout);reject(error);});
        child.on('message',message=>{if(message?.type==='native-ownership-ready'){clearTimeout(timeout);resolve(message);}});
        child.once('exit',code=>{clearTimeout(timeout);reject(Error('Owned PostgreSQL exited before barrier: '+code+' '+output));});
      });
      const item={child,ready,exited};children.push(item);return item;
    };
    const first=launch(),second=launch();
    const [a,b]=await Promise.all([first.ready,second.ready]);
    assert.notEqual(a.root,b.root);assert.notEqual(a.port,b.port);assert.notEqual(a.ownerId,b.ownerId);
    assert.equal(a.checkpoint,sha);assert.equal(b.checkpoint,sha);
    for(const [item,receipt]of [[first,a],[second,b]])item.child.send({type:'release-native-ownership',ownerId:receipt.ownerId});
    const outcomes=await Promise.all([first.exited,second.exited]);
    for(const [index,receipt]of [a,b].entries()){
      assert.equal(outcomes[index].code,0,outcomes[index].output);
      const result=JSON.parse(readFileSync(join(receipt.root,'result.json'),'utf8'));
      assert.equal(result.status,'passed');assert.equal(result.ownershipClosed,true);assert.equal(result.sourceVerified,true);
      assert.equal(existsSync(join(receipt.root,'data')),false);
    }
  }finally{
    for(const item of children)if(item.child.connected)item.child.send({type:'release-native-ownership',ownerId:'invalid'});
    // Every child has a bounded self-cleanup barrier/deadline. Never signal an
    // arbitrary PID or delete a cluster while its ownership remains uncertain.
    await Promise.allSettled(children.map(item=>item.exited));
    rmSync(source,{recursive:true,force:true});
  }
});
