import {execFileSync} from 'node:child_process';
import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function checkVitestInventory(directory,entries,configFiles){
 if(!Array.isArray(entries)||!entries.length)throw Error('Missing project inventory');
 const names=new Set(),configs=new Set();
 for(const e of entries){if(!/^[a-z0-9-]+$/.test(e.name)||! /^(?:[a-z0-9_-]+\/)*vitest\.[a-z0-9-]+\.config\.mts$/.test(e.config))throw Error('Invalid project entry');if(names.has(e.name)||configs.has(e.config))throw Error('Duplicate project');names.add(e.name);configs.add(e.config);}
 const files=configFiles??(await readdir(directory)).filter(f=>/^vitest\..+\.config\.mts$/.test(f));
 for(const f of files)if(!configs.has(f))throw Error('Unregistered Vitest configuration: '+f);
 for(const f of configs)if(!files.includes(f))throw Error('Missing Vitest configuration: '+f);
 for(const e of entries)if(!(await readFile(resolve(directory,e.config),'utf8')).includes("projectConfig('"+e.name+"'"))throw Error('Shared project configuration missing: '+e.config);
 return entries.length;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url)),entries=JSON.parse(await readFile(new URL('./vitest-projects.json',import.meta.url),'utf8'));
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).split('\0').filter(f=>/(^|\/)vitest\.[a-z0-9-]+\.config\.mts$/.test(f));
 const count=await checkVitestInventory(root,entries,[...new Set(files)]);console.log(`${count} named Vitest projects registered; no orphan configurations.`);
}
