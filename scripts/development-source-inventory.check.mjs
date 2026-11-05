import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
test('recognizes the approved Claude/Codex collaboration branch without bypassing ancestry', () => {
  const i=inventory();i.assemblyBranch='claude-codex-collab-nevora';
  const actual=heads();actual.set(i.assemblyBranch,next);
  assert.deepEqual(compareSources(i,actual,()=>true),[]);
  assert.deepEqual(compareSources(i,actual,value=>value===sha),[
    'Remote assembly has changes absent from this checkout',
  ]);
  i.assemblyBranch='claude/other';
  assert.throws(()=>validateInventory(i));
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
  i.maximumActiveBranches=6;
  for(let n=0;n<3;n++)i.sources.push({branch:'new-'+n,sha:next,disposition:'held',reason:'reserved work'});
  assert.deepEqual(compareSources(i,actual,()=>true),[]);
  actual.set('seventh',next);
  assert.deepEqual(compareSources(i,actual,()=>true),['Unclassified branch: seventh','Remote branch ceiling exceeded: 7 > 6']);
  i.maximumActiveBranches=7;
  assert.deepEqual(compareSources(i,actual,()=>true),['Unclassified branch: seventh']);
  i.sources.push({branch:'seventh',sha:next,disposition:'held',reason:'approved seventh branch'});
  assert.deepEqual(compareSources(i,actual,()=>true),[]);
  actual.set('eighth',next);
  assert.deepEqual(compareSources(i,actual,()=>true),['Unclassified branch: eighth','Remote branch ceiling exceeded: 8 > 7']);
  for(const value of [0,8,1.5,'7']){i.maximumActiveBranches=value;assert.throws(()=>validateInventory(i));}
});
test('parses exact lightweight archive tags without accepting malformed or duplicate refs',()=>{
  const ref='refs/tags/archive/branches/2026-10-22/feature';
  const parsed=parseRemoteRefs(`${sha}\trefs/heads/main\n${next}\t${ref}\n`);
  assert.deepEqual([...parsed.heads],[['main',sha]]);assert.deepEqual([...parsed.archives],[[ref,next]]);
  assert.throws(()=>parseRemoteRefs(`${sha}\t${ref}\n${next}\t${ref}\n`));
  assert.throws(()=>parseRemoteRefs(`${sha}\trefs/something/main\n`));
});

test('published policy validates the three allowed heads and detects recreated or damaged archives',()=>{
  const published=validateInventory(JSON.parse(readFileSync(new URL('../docs/handoffs/2026-10-21-development-assembly-sources.json',import.meta.url),'utf8')));
  assert.equal(published.maximumActiveBranches,3);
  assert.equal(published.assemblyBranch,'claude-codex-collab-nevora');
  // A classified held source records work; it does not grant a fourth active slot.
  // Model the allowed post-reconciliation state separately from today's live inventory.
  const allowed=new Set(['main','development','claude-codex-collab-nevora']);
  const i={...published,sources:published.sources.filter(source=>source.archiveRef||allowed.has(source.branch))};
  assert.deepEqual(i.sources.filter(source=>!source.archiveRef).map(source=>source.branch).sort(),
    ['claude-codex-collab-nevora','development','main']);
  const actual=new Map(i.sources.filter(source=>!source.archiveRef).map(source=>[source.branch,source.sha]));
  const archives=new Map(i.sources.filter(source=>source.archiveRef).map(source=>[source.archiveRef,source.sha]));
  assert.deepEqual(compareSources(i,actual,()=>true,archives),[]);
  for(const name of ['AI-owner','claude/employee-mobile-phase2-20261027','codex/release1-db-rehearsal-20261101']) {
    const retired=i.sources.find(source=>source.branch===name);
    assert.ok(retired?.archiveRef,`Missing recoverable archive for ${name}`);
    actual.set(name,retired.sha);
    assert.deepEqual(compareSources(i,actual,()=>true,archives),['Remote branch ceiling exceeded: 4 > 3']);
    actual.delete(name);
    const damaged=new Map(archives);damaged.set(retired.archiveRef,next);
    assert.deepEqual(compareSources(i,actual,()=>true,damaged),[`Archive changed: ${name}`]);
    damaged.delete(retired.archiveRef);
    assert.deepEqual(compareSources(i,actual,()=>true,damaged),[`Missing archive: ${name}`]);
  }
});

test('classifying a fourth held head never makes the published three-branch gate green',()=>{
  const i={schema:1,target:'development',assemblyBranch:'claude-codex-collab-nevora',maximumActiveBranches:3,sources:[
    {branch:'main',sha,disposition:'protected',reason:'protected'},
    {branch:'development',sha,disposition:'target',reason:'combined line'},
    {branch:'claude-codex-collab-nevora',sha,disposition:'held',reason:'allowed collaboration'},
    {branch:'held-review-work',sha:next,disposition:'held',reason:'recorded, not an extra policy slot'},
  ]};
  const actual=new Map(i.sources.map(source=>[source.branch,source.sha]));
  assert.deepEqual(compareSources(i,actual,()=>true),['Remote branch ceiling exceeded: 4 > 3']);
  actual.set('held-review-work','c'.repeat(40));
  assert.deepEqual(compareSources(i,actual,()=>true),['Branch advanced: held-review-work','Remote branch ceiling exceeded: 4 > 3']);
});
