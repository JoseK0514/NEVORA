import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateInventory, parseHeads, compareSources} from './development-source-inventory.mjs';

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
