import {describe,it,expect} from '@rstest/core';
import {parseRosterTable} from './roster';

const defaults={primaryLocationId:'cafe',eligibleLocationIds:['cafe'],positionIds:['barista']};
const header='id,firstName,lastName,phone,email';
describe('reviewing a roster before creating people',()=>{
 it('reads quoted CSV, keeps Spanish names and applies explicitly chosen assignments',()=>{
  const r=parseRosterTable({format:'csv',text:'\ufeff'+header+'\r\nemp-01,"Ana, María",Pérez,787-555-0101,ana@example.invalid\r\n',defaults});
  expect(r.state).toBe('ready');if(r.state!=='ready')return;
  expect(r.valid).toBe(true);expect(r.rows).toHaveLength(1);
  expect(r.rows[0].person).toEqual({employee:{id:'EMP-01',firstName:'Ana, María',lastName:'Pérez',phone:'787-555-0101',email:'ana@example.invalid',role:'EMPLOYEE',primaryLocationId:'cafe',eligibleLocationIds:['cafe'],positionIds:['barista']}});
 });
 it('accepts pasted tabular data and escaped quotes without evaluating cell contents',()=>{
  const r=parseRosterTable({format:'tsv',text:'ID\tFirst name\tLast name\tPhone\tEmail\nE-2\t"Jo ""JJ"""\tRivera\t7875550102\t\n',defaults});
  expect(r.state).toBe('ready');if(r.state!=='ready')return;
  expect(r.valid).toBe(true);expect(r.rows[0].person?.employee.firstName).toBe('Jo "JJ"');expect(r.rows[0].person?.employee.email).toBeNull();
 });
 it('reports normalized duplicate IDs and duplicate email rows before import',()=>{
  const r=parseRosterTable({format:'csv',text:header+'\ne-1,Ana,Uno,7875550101,same@example.invalid\nE-1,Ana,Dos,7875550102,same@example.invalid',defaults});
  expect(r.state).toBe('ready');if(r.state!=='ready')return;
  expect(r.valid).toBe(false);expect(r.rows[1].fieldErrors).toEqual(expect.arrayContaining([{field:'id',code:'DUPLICATE_ID'},{field:'email',code:'DUPLICATE_EMAIL'}]));
 });
 it('gives field-specific errors without creating placeholder profiles',()=>{
  const r=parseRosterTable({format:'csv',text:header+'\nEMP-1,,Pérez,invalid,not-email',defaults});
  expect(r.state).toBe('ready');if(r.state!=='ready')return;
  expect(r.rows[0].person).toBeNull();expect(r.rows[0].fieldErrors).toEqual(expect.arrayContaining([{field:'firstName',code:'REQUIRED'},{field:'phone',code:'INVALID_PHONE'},{field:'email',code:'INVALID_EMAIL'}]));
 });
 it('keeps privileged access explicit and refuses Owner creation through a roster',()=>{
  const r=parseRosterTable({format:'csv',text:header+',role\nM-1,Ana,Pérez,7875550101,m@example.invalid,MANAGER\nO-2,Otro,Dueño,7875550102,o@example.invalid,OWNER',defaults});
  expect(r.state).toBe('ready');if(r.state!=='ready')return;
  expect(r.valid).toBe(false);expect(r.rows[0].fieldErrors).toContainEqual({field:'initialManagerScope',code:'MANAGER_SCOPE_REQUIRED'});expect(r.rows[1].fieldErrors).toContainEqual({field:'role',code:'OWNER_NOT_IMPORTABLE'});
 });
 it('applies the explicitly selected scope only to Manager rows',()=>{
  const r=parseRosterTable({format:'csv',text:header+',role\nM-1,Ana,Pérez,7875550101,m@example.invalid,MANAGER\nE-1,Luis,Rivera,7875550102,e@example.invalid,EMPLOYEE',defaults:{...defaults,initialManagerScope:{mode:'LOCATIONS',locationIds:['cafe']}}});
  expect(r.state).toBe('ready');if(r.state!=='ready')return;
  expect(r.valid).toBe(true);expect(r.rows[0].person?.initialManagerScope).toEqual({mode:'LOCATIONS',locationIds:['cafe']});expect(r.rows[1].person?.initialManagerScope).toBeUndefined();
 });
 it.each(['id,firstName,first_name,phone\nE-1,A,B,7875550101',header+'\nE-1,"unclosed,Pérez,7875550101,a@example.invalid',header+'\nE-1,"Ana"oops,Pérez,7875550101,a@example.invalid'])('rejects ambiguous or malformed CSV',text=>{
  expect(parseRosterTable({format:'csv',text,defaults}).state).toBe('invalid');
 });
 it('bounds input and rows while accepting a genuine 30-person roster',()=>{
  const row=(n:number)=>`E-${n},Persona,${n},787555${String(n).padStart(4,'0')},e${n}@example.invalid`;
  const r=parseRosterTable({format:'csv',text:header+'\n'+Array.from({length:30},(_,i)=>row(i+1)).join('\n'),defaults});
  expect(r.state).toBe('ready');if(r.state==='ready'){expect(r.valid).toBe(true);expect(r.rows).toHaveLength(30);}
  expect(parseRosterTable({format:'csv',text:header+'\n'+Array.from({length:51},(_,i)=>row(i+1)).join('\n'),defaults}).state).toBe('invalid');
  expect(parseRosterTable({format:'csv',text:'a'.repeat(65537),defaults}).state).toBe('invalid');
 });
});

it('flags case variants of the same email before commit, matching database uniqueness',()=>{
 const result=parseRosterTable({format:'csv',text:'id,firstName,lastName,phone,email\nE1,Ana,Pérez,7875550101,Ana@Example.invalid\nE2,Alex,Rivera,7875550102,ana@example.invalid',defaults:{primaryLocationId:'loc-1'}});
 expect(result.state).toBe('ready');if(result.state==='ready'){expect(result.valid).toBe(false);expect(result.rows[1].fieldErrors).toContainEqual({field:'email',code:'DUPLICATE_EMAIL'});}
});
