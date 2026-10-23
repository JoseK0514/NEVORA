import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateInventory, parseHeads, parseRemoteRefs, compareSources} from './development-source-inventory.mjs';

const sha = 'a'.repeat(40), next = 'b'.repeat(40);
const inventory = () => ({schema:1,target:'development',assemblyBranch:'codex/assembly',sources:[
  {branch:'main',sha,disposition:'protected',reason:'protected'},
  {branch:'development',sha,disposition:'target',reason:'target'},
  {branch:'feature',sha,disposition:'included',reason:'merged'},
]});
const heads = () => new Map([['main',sha],['development',sha],['feature',sha]]);

test('accepts included sources, incorporated development advance and own PR branch', () => {
  const actual = heads(); actual.set('development',next); actual.set('codex/assembly',next);
  assert.deepEqual(compareSources(inventory(),actual,()=>true),[]);
});
test('rejects changed, missing and unclassified source heads', () => {
  const actual = heads(); actual.set('feature',next); actual.delete('main'); actual.set('new-feature',next);
  assert.deepEqual(compareSources(inventory(),actual,()=>true),[
    'Missing branch: main','Branch advanced: feature','Unclassified branch: new-feature',
  ]);
});
test('rejects omitted merged sources and unincorporated development changes', () => {
  assert.deepEqual(compareSources(inventory(),heads(),()=>false),[
    'Remote development has changes absent from this checkout','Source absent from checkout: feature',
  ]);
});
test('does not hide new work pushed to the assembly branch after integration', () => {
  const actual = heads(); actual.set('codex/assembly',next);
  assert.deepEqual(compareSources(inventory(),actual,value=>value===sha),[
    'Remote assembly has changes absent from this checkout',
  ]);
});
test('rejects invalid hashes, duplicate sources and relaxed main disposition', () => {
  for (const mutate of [i=>i.sources[0].sha='short',i=>i.sources.push(i.sources[0]),i=>i.sources[0].disposition='reference']) {
    const i=inventory(); mutate(i); assert.throws(()=>validateInventory(i));
  }
});
test('parses only exact branch heads and rejects duplicate or malformed output', () => {
  assert.deepEqual([...parseHeads(`${sha}\trefs/heads/main\n`)], [['main',sha]]);
  assert.throws(()=>parseHeads(`${sha}\trefs/heads/main\n${next}\trefs/heads/main`));
  assert.throws(()=>parseHeads('short refs/heads/main'));
});

test('retired heads require the exact recoverable archive tag, even before deletion',()=>{
  const i=inventory();i.sources[2].archiveRef='refs/tags/archive/branches/2026-10-22/feature';
  const archives=new Map([[i.sources[2].archiveRef,sha]]);
  assert.deepEqual(compareSources(i,heads(),()=>true,archives),[]);
  const deleted=heads();deleted.delete('feature');
  assert.deepEqual(compareSources(i,deleted,()=>true,archives),[]);
  assert.deepEqual(compareSources(i,deleted,()=>true,new Map()),['Missing archive: feature']);
  assert.deepEqual(compareSources(i,deleted,()=>true,new Map([[i.sources[2].archiveRef,next]])),['Archive changed: feature']);
});
test('retirement never hides new commits pushed to the source branch',()=>{
  const i=inventory();i.sources[2].archiveRef='refs/tags/archive/branches/2026-10-22/feature';
  const actual=heads();actual.set('feature',next);
  assert.deepEqual(compareSources(i,actual,()=>true,new Map([[i.sources[2].archiveRef,sha]])),['Branch advanced: feature']);
});
test('cannot retire main or development, or substitute unrelated archive refs',()=>{
  for(const mutate of [i=>i.sources[0].archiveRef='refs/tags/archive/branches/2026-10-22/main',
    i=>i.sources[1].archiveRef='refs/tags/archive/branches/2026-10-22/development',
    i=>i.sources[2].archiveRef='refs/tags/unrelated',
    i=>i.sources[2].archiveRef='refs/tags/archive/branches/2026-10-22/other']) {
    const i=inventory();mutate(i);assert.throws(()=>validateInventory(i));
  }
});
test('enforces the approved remote branch ceiling without hiding extra heads',()=>{
  const i=inventory();i.maximumActiveBranches=5;
  const actual=heads();for(let n=0;n<3;n++)actual.set('new-'+n,next);
  const failures=compareSources(i,actual,()=>true);
  assert.ok(failures.includes('Remote branch ceiling exceeded: 6 > 5'));
  assert.ok(failures.includes('Unclassified branch: new-0'));
  for(const value of [0,6,1.5,'5']){i.maximumActiveBranches=value;assert.throws(()=>validateInventory(i));}
});
test('parses exact lightweight archive tags without accepting malformed or duplicate refs',()=>{
  const ref='refs/tags/archive/branches/2026-10-22/feature';
  const parsed=parseRemoteRefs(`${sha}\trefs/heads/main\n${next}\t${ref}\n`);
  assert.deepEqual([...parsed.heads],[['main',sha]]);assert.deepEqual([...parsed.archives],[[ref,next]]);
  assert.throws(()=>parseRemoteRefs(`${sha}\t${ref}\n${next}\t${ref}\n`));
  assert.throws(()=>parseRemoteRefs(`${sha}\trefs/something/main\n`));
});
