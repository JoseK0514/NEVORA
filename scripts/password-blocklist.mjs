/** Reproduce the pinned local corpus; reads a downloaded public source, never application passwords. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source=process.argv[2];
if(!source)throw Error('Provide the local SecLists source path documented in src/lib/auth/blocked-passwords.md');
const raw=readFileSync(source);
if(createHash('sha256').update(raw).digest('hex')!=='424a3e03a17df0a2bc2b3ca749d81b04e79d59cb7aeec8876a5a3f308d0caf51')throw Error('Source differs from the reviewed pinned corpus');
const hashes=[...new Set(raw.toString('utf8').replace(/^\uFEFF/,'').split(/\r?\n/).filter(v=>{const count=Array.from(v).length;return count>=15&&count<=1024;}).map(v=>createHash('sha256').update(v.normalize('NFC')).digest('hex')))].sort();
const output=JSON.stringify(hashes)+'\n',target=new URL('../src/lib/auth/blocked-passwords.json',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==output)throw Error('Committed blocklist does not match its pinned source');}
else writeFileSync(target,output);
console.log(`Verified ${hashes.length} local password blocklist digests.`);
