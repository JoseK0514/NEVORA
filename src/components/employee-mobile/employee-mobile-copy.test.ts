import {describe,expect,it} from '@rstest/core';
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {employeeMobileCopy} from './employee-mobile-copy';

/** Every path in a table, with its kind (a function also carries its arity). */
function shape(value:unknown,path='',out:string[]=[]):string[]{
 if(typeof value==='function'){out.push(`${path}:fn${value.length}`);return out;}
 if(value&&typeof value==='object'&&!Array.isArray(value)){for(const key of Object.keys(value).sort())shape((value as Record<string,unknown>)[key],path?`${path}.${key}`:key,out);return out;}
 if(Array.isArray(value)){out.push(`${path}:array${value.length}`);value.forEach((item,index)=>shape(item,`${path}[${index}]`,out));return out;}
 out.push(`${path}:${typeof value}`);return out;
}
function strings(value:unknown,out:string[]=[]):string[]{
 if(typeof value==='string')out.push(value);else if(value&&typeof value==='object')for(const item of Object.values(value))strings(item,out);
 return out;
}

describe('employee-mobile copy tables',()=>{
 it('lists every table in ./copy',()=>{
  const files=readdirSync(join(__dirname,'copy')).filter(name=>name.endsWith('.ts')).map(name=>name.slice(0,-3)).sort();
  expect(Object.keys(employeeMobileCopy).sort()).toEqual(files);
 });
 for(const [name,table] of Object.entries(employeeMobileCopy)){
  it(`${name}: English and Spanish have the same keys, kinds and function arities`,()=>{
   expect(shape(table.es)).toEqual(shape(table.en));
  });
  it(`${name}: no Spanish string is empty where English has words, and none has an exclamation mark`,()=>{
   const en=strings(table.en),es=strings(table.es);
   es.forEach((text,index)=>{if(en[index]?.trim())expect(text.trim()).not.toBe('');});
   for(const text of es)expect(text).not.toMatch(/[!¡]/);
  });
 }
});
